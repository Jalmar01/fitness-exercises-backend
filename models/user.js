import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

export class UserModel {
  /**
   * Find a user by email.
   * @param {{ email: string }} params
   * @returns {Promise<object|null>} user with id (UUID string), name, email, role, is_active, or null
   */
  static async findByEmail({ email }) {
    const [rows] = await pool.query(
      `SELECT BIN_TO_UUID(id) AS id, name, email, password, role, is_active
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) return null;
    return rows[0];
  }

  /**
   * Find a user by id.
   * @param {{ id: string }} params
   * @returns {Promise<object|null>} user with id (UUID string), name, email, role, is_active, or null
   */
  static async findById({ id }) {
    const [rows] = await pool.query(
      `SELECT BIN_TO_UUID(id) AS id, name, email, password, role, is_active
       FROM users
       WHERE id = UUID_TO_BIN(?)`,
      [id]
    );

    if (rows.length === 0) return null;
    return rows[0];
  }

  /**
   * Create a new user with a hashed password.
   * @param {{ name: string, email: string, password: string, role?: string }} params
   * @returns {Promise<{ id: string, name: string, email: string, role: string }>}
   */
  static async create({ name, email, password, role = 'user' }) {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (id, name, email, password, role)
       VALUES (UUID_TO_BIN(?), ?, ?, ?, ?)`,
      [id, name, email, hashedPassword, role]
    );

    return { id, name, email, role };
  }

  /**
   * Update the refresh token for a user.
   * @param {{ id: string, refreshToken: string|null }} params
   */
  static async updateRefreshToken({ id, refreshToken }) {
    await pool.query(
      `UPDATE users
       SET refresh_token = ?, refresh_token_created_at = IF(? IS NULL, NULL, NOW())
       WHERE id = UUID_TO_BIN(?)`,
      [refreshToken, refreshToken, id]
    );
  }

  /**
   * Find a user by refresh token.
   * @param {{ refreshToken: string }} params
   * @returns {Promise<object|null>} user with id (UUID string), email, role, refresh_token, refresh_token_created_at
   */
  static async findByRefreshToken({ refreshToken }) {
    const [rows] = await pool.query(
      `SELECT BIN_TO_UUID(id) AS id, name, email, role, refresh_token, refresh_token_created_at
       FROM users
       WHERE refresh_token = ?`,
      [refreshToken]
    );

    if (rows.length === 0) return null;
    return rows[0];
  }
}
