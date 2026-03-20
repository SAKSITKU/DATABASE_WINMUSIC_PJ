import { getPool } from './db.js';

// ✅ CHECKOUT (MySQL version)
export async function checkoutNoHeader({ items = [], currentUserId = 0 }) {

  if (!Array.isArray(items) || items.length === 0) {
    const e = new Error('Order items is empty');
    e.http = 400;
    throw e;
  }

  items = items
    .map(x => ({ product_id: Number(x.product_id), quantity: Number(x.quantity) }))
    .filter(x => x.product_id > 0 && x.quantity > 0);

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 🔥 สำคัญ: ให้ trigger ใช้ user นี้
    await conn.query(`SET @user_id = ?`, [currentUserId]);

    // MySQL ไม่มี sequence → ใช้ timestamp
    // ✅ สร้าง OrderID เอง แต่ต้องไม่ overflow
const orderId = Math.floor(Date.now() / 1000);

    for (const { product_id: pid, quantity: qty } of items) {

      // 1. ดึงสินค้า
      const [rows] = await conn.query(
        `SELECT UnitPrice, UnitsInStock FROM Products WHERE ProductID = ?`,
        [pid]
      );

      if (!rows.length) {
        throw new Error(`Product not found: ${pid}`);
      }

      const unitPrice = rows[0].UnitPrice;

      // 2. คำนวณ discount
      const [disc] = await conn.query(
        `SELECT fn_GetDiscountRate(?) AS rate`,
        [qty]
      );

      const discountRate = disc[0].rate;

      // 3. insert order detail
      await conn.query(`
        INSERT INTO OrderDetails (OrderID, ProductID, UnitPrice, Quantity, Discount)
        VALUES (?, ?, ?, ?, ?)
      `, [orderId, pid, unitPrice, qty, discountRate]);

      // 4. update stock → trigger จะทำงาน
      await conn.query(`
        UPDATE Products
        SET UnitsInStock = UnitsInStock - ?
        WHERE ProductID = ?
      `, [qty, pid]);
    }

    await conn.commit();
    conn.release();

    return { orderId };

  } catch (err) {
    await conn.rollback();
    conn.release();

    let msg = err.message || '';

    if (msg.includes('UnitsInStock')) {
      msg = '❌ ไม่สามารถสั่งซื้อได้: สินค้าในสต็อกไม่เพียงพอ';
    }

    const e = new Error(msg);
    e.http = 400;
    throw e;
  }
}

// ✅ GET ORDER ITEMS
export async function getOrderItems(orderId) {
  const pool = await getPool();

  const [rows] = await pool.query(`
    SELECT
      od.ProductID AS id,
      p.ProductName AS name,
      od.UnitPrice AS unit_price,
      od.Quantity AS qty,
      od.Discount AS rate,
      (od.UnitPrice * od.Quantity) * od.Discount AS discount_amount,
      (od.UnitPrice * od.Quantity) * (1 - od.Discount) AS line_total,
      p.ImageURL AS image_url
    FROM OrderDetails od
    JOIN Products p ON p.ProductID = od.ProductID
    WHERE od.OrderID = ?
    ORDER BY od.ProductID
  `, [orderId]);

  return rows;
}

// ✅ PREVIEW (แทน Stored Procedure)
export async function previewAfterDiscountByOrderId(orderId) {
  const pool = await getPool();

    const [items] = await pool.query(`
    SELECT
      od.ProductID AS id,
      p.ProductName AS name,
      p.UnitPrice AS unit_price,
      od.Quantity AS qty,
      fn_GetDiscountRate(od.Quantity) AS rate,
      (p.UnitPrice * od.Quantity) * fn_GetDiscountRate(od.Quantity) AS discount_amount,
      (p.UnitPrice * od.Quantity) * (1 - fn_GetDiscountRate(od.Quantity)) AS line_total
    FROM OrderDetails od
    JOIN Products p ON od.ProductID = p.ProductID
    WHERE od.OrderID = ?
    ORDER BY od.ProductID
  `, [orderId]);

  // ✅ summary ถูกอยู่แล้ว
  const [sum] = await pool.query(`
    SELECT
      SUM(p.UnitPrice * od.Quantity) AS Subtotal,
      SUM((p.UnitPrice * od.Quantity) * fn_GetDiscountRate(od.Quantity)) AS TotalDiscount,
      SUM((p.UnitPrice * od.Quantity) * (1 - fn_GetDiscountRate(od.Quantity))) AS GrandTotal
    FROM OrderDetails od
    JOIN Products p ON od.ProductID = p.ProductID
    WHERE od.OrderID = ?
  `, [orderId]);

  return {
    items,
    summary: {
      order_id: orderId,
      subtotal: Number(sum[0]?.Subtotal || 0),
      discount_total: Number(sum[0]?.TotalDiscount || 0),
      grand_total: Number(sum[0]?.GrandTotal || 0),
    }
  };
}