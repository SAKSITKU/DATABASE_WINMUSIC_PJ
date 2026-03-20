import { getPool } from './db.js';

// 📦 ดึงทั้งหมด
export async function listCategories() {
  const pool = await getPool();

  const [rows] = await pool.execute(`
    SELECT CategoryID, CategoryName
    FROM Categories
    ORDER BY CategoryID DESC
  `);

  return rows;
}

// ➕ สร้าง
export async function createCategory({ CategoryName }) {
  const pool = await getPool();

  const [result] = await pool.execute(
    `
    INSERT INTO Categories (CategoryName)
    VALUES (?)
    `,
    [CategoryName]
  );

  return {
    id: result.insertId
  };
}

// 🔍 หา by id
export async function getCategoryById(id) {
  const pool = await getPool();

  const [rows] = await pool.execute(
    `
    SELECT CategoryID AS id, CategoryName
    FROM Categories
    WHERE CategoryID = ?
    `,
    [id]
  );

  return rows[0] || null;
}

// ✏ update
export async function updateCategory(id, { CategoryName }) {
  const pool = await getPool();

  await pool.execute(
    `
    UPDATE Categories
    SET CategoryName = ?
    WHERE CategoryID = ?
    `,
    [CategoryName, id]
  );

  return { id };
}