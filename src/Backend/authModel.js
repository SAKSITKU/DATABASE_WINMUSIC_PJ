import { getPool } from './db.js';
import bcrypt from 'bcryptjs';

// 🔍 หา user
export async function findUserByUsername(username) {
  const pool = await getPool();

  const [rows] = await pool.execute(
    `
    SELECT UserID AS id, Username, Password AS PasswordHash, Role
    FROM Users
    WHERE Username = ?
    `,
    [username]
  );

  return rows[0] || null;
}

// ➕ สร้าง user
export async function createUser({ username, password, role = 'user' }) {
  const pool = await getPool();
  const hash = await bcrypt.hash(password, 10);

  const [result] = await pool.execute(
    `
    INSERT INTO Users (Username, Password, Role)
    VALUES (?, ?, ?)
    `,
    [username, hash, role]
  );

  return {
    id: result.insertId,
    Username: username,
    Role: role
  };
}