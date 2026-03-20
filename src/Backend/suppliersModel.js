import { getPool } from './db.js';

// ➕ create
export async function createSupplier({
  CompanyName,
  ContactName = null,
  Address = null,
  PostalCode = null,
  Country = null,
}) {
  const pool = await getPool();

  const [result] = await pool.execute(
    `
    INSERT INTO Suppliers (CompanyName, ContactName, Address, PostalCode, Country)
    VALUES (?, ?, ?, ?, ?)
    `,
    [CompanyName, ContactName, Address, PostalCode, Country]
  );

  return { id: result.insertId };
}

// 🔍 get by id
export async function getSupplierById(id) {
  const pool = await getPool();

  const [rows] = await pool.execute(
    `
    SELECT
      SupplierID AS id,
      CompanyName,
      ContactName,
      Address,
      PostalCode,
      Country
    FROM Suppliers
    WHERE SupplierID = ?
    `,
    [id]
  );

  return rows[0] || null;
}

// ✏ update
export async function updateSupplier(
  id,
  { CompanyName = null, ContactName = null, Address = null, PostalCode = null, Country = null }
) {
  const pool = await getPool();

  await pool.execute(
    `
    UPDATE Suppliers
    SET 
      CompanyName = ?,
      ContactName = ?,
      Address = ?,
      PostalCode = ?,
      Country = ?
    WHERE SupplierID = ?
    `,
    [CompanyName, ContactName, Address, PostalCode, Country, id]
  );

  return { id };
}