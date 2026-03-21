import { getPool } from './db.js';

// ✅ คำนวณ Discount Rate ใน JavaScript แทน MySQL Function
function getDiscountRate(qty) {
  if (qty >= 2) return 0.15;
  return 0.00;
}

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
      const unitsInStock = rows[0].UnitsInStock;

      // ✅ เช็คสต็อกใน JS
      if (qty > unitsInStock) {
        throw new Error(`UnitsInStock ไม่เพียงพอสำหรับสินค้า ID: ${pid}`);
      }

      // 2. ✅ คำนวณ discount ใน JS แทน MySQL Function
      const discountRate = getDiscountRate(qty);

      // 3. insert order detail
      await conn.query(`
        INSERT INTO OrderDetails (OrderID, ProductID, UnitPrice, Quantity, Discount)
        VALUES (?, ?, ?, ?, ?)
      `, [orderId, pid, unitPrice, qty, discountRate]);

      // 4. update stock
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

// ✅ PREVIEW (คำนวณ discount ใน JS แทน MySQL Function)
export async function previewAfterDiscountByOrderId(orderId) {
  const pool = await getPool();

  const [rows] = await pool.query(`
    SELECT
      od.ProductID AS id,
      p.ProductName AS name,
      p.UnitPrice AS unit_price,
      od.Quantity AS qty,
      od.Discount AS rate
    FROM OrderDetails od
    JOIN Products p ON od.ProductID = p.ProductID
    WHERE od.OrderID = ?
    ORDER BY od.ProductID
  `, [orderId]);

  // ✅ คำนวณใน JS แทน
  const items = rows.map(row => {
    const rate = getDiscountRate(row.qty);
    const discount_amount = row.unit_price * row.qty * rate;
    const line_total = row.unit_price * row.qty * (1 - rate);
    return {
      ...row,
      rate,
      discount_amount,
      line_total,
    };
  });

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const discount_total = items.reduce((s, i) => s + i.discount_amount, 0);
  const grand_total = items.reduce((s, i) => s + i.line_total, 0);

  return {
    items,
    summary: {
      order_id: orderId,
      subtotal: Number(subtotal.toFixed(2)),
      discount_total: Number(discount_total.toFixed(2)),
      grand_total: Number(grand_total.toFixed(2)),
    }
  };
}