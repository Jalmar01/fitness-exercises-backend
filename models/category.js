import pool from '../config/db.js';
import { randomUUID } from 'node:crypto';

export class CategoryModel {
    static async getAll ({ page = 1, limit = 10 } = {}) {
        // Clamp limit to max 100, min 1
        const clampedLimit = Math.min(Math.max(1, limit), 100);
        const offset = (page - 1) * clampedLimit;

        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) AS total FROM categories WHERE is_active = TRUE'
        );

        const [rows] = await pool.query(
            `SELECT BIN_TO_UUID(c.id) AS id, c.name, c.description,
                    (SELECT COUNT(*) FROM exercises e WHERE e.category_id = UUID_TO_BIN(c.id) AND e.is_active = TRUE) AS exercise_count
             FROM categories c
             WHERE c.is_active = TRUE
             ORDER BY c.name
             LIMIT ? OFFSET ?`,
            [clampedLimit, offset]
        );

        return { data: rows, total, page, limit: clampedLimit };
    }

    static async getById ({ id }) {
        const [rows] = await pool.query(
            `SELECT BIN_TO_UUID(c.id) AS id, c.name, c.description,
                    (SELECT COUNT(*) FROM exercises e WHERE e.category_id = UUID_TO_BIN(c.id) AND e.is_active = TRUE) AS exercise_count
             FROM categories c
             WHERE c.id = UUID_TO_BIN(?) AND c.is_active = TRUE`,
            [id]
        );

        if (rows.length === 0) return null;
        return rows[0];
    }

    static async create ({ name, description }) {
        const id = randomUUID();

        await pool.query(
            `INSERT INTO categories (id, name, description)
             VALUES (UUID_TO_BIN(?), ?, ?)`,
            [id, name, description ?? null]
        );

        return { id, name, description: description ?? null };
    }

    static async update ({ id, data }) {
        const fields = Object.keys(data);
        if (fields.length === 0) return null;

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = Object.values(data);

        const [result] = await pool.query(
            `UPDATE categories
             SET ${setClause}
             WHERE id = UUID_TO_BIN(?) AND is_active = TRUE`,
            [...values, id]
        );

        if (result.affectedRows === 0) return null;

        return this.getById({ id });
    }

    static async delete ({ id }) {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()

            // 1. SELECT the category first (without is_active filter)
            const [rows] = await connection.query(
                `SELECT BIN_TO_UUID(id) AS id, name, description, is_active
                 FROM categories
                 WHERE id = UUID_TO_BIN(?)`,
                [id]
            )

            if (rows.length === 0) {
                await connection.rollback()
                connection.release()
                return null
            }

            if (!rows[0].is_active) {
                await connection.rollback()
                connection.release()
                return null
            }

            const category = rows[0]
            delete category.is_active

            // 2. Cascade soft-delete exercises
            await connection.query(
                `UPDATE exercises SET is_active = FALSE WHERE category_id = UUID_TO_BIN(?) AND is_active = TRUE`,
                [id]
            )

            // 3. Soft-delete the category
            await connection.query(
                `UPDATE categories SET is_active = FALSE WHERE id = UUID_TO_BIN(?) AND is_active = TRUE`,
                [id]
            )

            await connection.commit()
            connection.release()
            return category
        } catch (error) {
            await connection.rollback()
            connection.release()
            throw error
        }
    }

    static async restore ({ id }) {
        const [result] = await pool.query(
            `UPDATE categories SET is_active = TRUE WHERE id = UUID_TO_BIN(?) AND is_active = FALSE`,
            [id]
        );

        if (result.affectedRows === 0) return null;

        return this.getById({ id });
    }
}
