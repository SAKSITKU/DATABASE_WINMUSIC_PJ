import { getPool } from './db.js';

// 📦 list
export async function listProducts() {
  const pool = await getPool();

  const [rows] = await pool.execute(`
    SELECT
      ProductID     AS id,
      ProductName   AS name,
      UnitPrice     AS price,
      UnitsInStock  AS stock,
      ImageURL      AS image_url,
      CategoryID    AS category_id,
      SupplierID    AS supplier_id,
      Description   AS description,
      date_added,
      last_updated
    FROM Products
    ORDER BY ProductID DESC
  `);

  return rows;
}

// ➕ create
export async function createProduct(data) {
  const pool = await getPool();

  const [result] = await pool.execute(
    `
    INSERT INTO Products
    (ProductName, UnitPrice, UnitsInStock, ImageURL, CategoryID, SupplierID, Description, date_added, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
    [
      data.name,
      data.price ?? 0,
      data.stock ?? 0,
      data.image_url ?? null,
      data.category_id ?? null,
      data.supplier_id ?? null,
      data.description ?? null
    ]
  );

  return result.insertId;
}

// ✏ update
export async function updateProduct(id, data, currentUserId = 0) {
  const pool = await getPool();

  // 🔥 ให้ trigger ใช้
  await pool.query(`SET @user_id = ?`, [currentUserId]);

  const fields = [];
  const values = [];

  if (data.name !== undefined) {
    fields.push("ProductName=?");
    values.push(data.name);
  }

  if (data.price !== undefined) {
    fields.push("UnitPrice=?");
    values.push(data.price);
  }

  if (data.stock !== undefined) {
    fields.push("UnitsInStock=?");
    values.push(data.stock);
  }

  if (data.image_url !== undefined) {
    fields.push("ImageURL=?");
    values.push(data.image_url);
  }

  if (data.category_id !== undefined) {
    fields.push("CategoryID=?");
    values.push(data.category_id);
  }

  if (data.supplier_id !== undefined) {
    fields.push("SupplierID=?");
    values.push(data.supplier_id);
  }

  if (data.description !== undefined) {
    fields.push("Description=?");
    values.push(data.description);
  }

  // ป้องกัน update ว่าง
  if (!fields.length) return;

  fields.push("last_updated = NOW()");
  values.push(id);

  await pool.query(
    `UPDATE Products SET ${fields.join(", ")} WHERE ProductID=?`,
    values
  );
}
// ❌ delete
export async function deleteProduct(id) {
  const pool = await getPool();

  await pool.execute(
    `DELETE FROM Products WHERE ProductID=?`,
    [id]
  );
}

// 💰 quote (เวอร์ชันง่ายแทน CROSS APPLY)
export async function getProductQuote(productId, qty) {
  const pool = await getPool();

  const [rows] = await pool.execute(
    `
    SELECT 
      ProductID AS id,
      ProductName AS name,
      UnitPrice AS unit_price
    FROM Products
    WHERE ProductID = ?
    `,
    [productId]
  );

  if (rows.length === 0) return null;

  const p = rows[0];
  const line_total = p.unit_price * qty;

  return {
    id: p.id,
    name: p.name,
    unit_price: p.unit_price,
    qty,
    rate: 0,
    net_unit_price: p.unit_price,
    line_total
  };
}

// 🏆 top 5 (แทน stored procedure)
export async function getTop5Products() {
  const pool = await getPool();

  const [rows] = await pool.execute(`
    SELECT *
    FROM Products
    ORDER BY UnitsInStock DESC
    LIMIT 5
  `);

  return rows;
}