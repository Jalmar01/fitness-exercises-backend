import pool from '../config/db.js';
import { randomUUID } from 'node:crypto';

export class CategoryModel {
    static async getAll ({ page = 1, limit = 10 } = {}) {
        const clampedLimit = Math.min(Math.max(1, limit), 100);
        const offset = (page - 1) * clampedLimit;

        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) AS total FROM categories'
        );

        const [rows] = await pool.query(
            `SELECT BIN_TO_UUID(c.id) AS id, c.name,
                    (SELECT COUNT(*) FROM exercises e WHERE e.category_id = UUID_TO_BIN(c.id) AND e.is_active = TRUE) AS exercise_count
             FROM categories c
             ORDER BY c.name
             LIMIT ? OFFSET ?`,
            [clampedLimit, offset]
        );

        return { data: rows, total, page, limit: clampedLimit };
    }

    static async getById ({ id }) {
        const [rows] = await pool.query(
            `SELECT BIN_TO_UUID(c.id) AS id, c.name,
                    (SELECT COUNT(*) FROM exercises e WHERE e.category_id = UUID_TO_BIN(c.id) AND e.is_active = TRUE) AS exercise_count
             FROM categories c
             WHERE c.id = UUID_TO_BIN(?)`,
            [id]
        );

        if (rows.length === 0) return null;
        return rows[0];
    }

    static async create ({ name }) {
        const id = randomUUID();

        await pool.query(
            `INSERT INTO categories (id, name)
             VALUES (UUID_TO_BIN(?), ?)`,
            [id, name]
        );

        return { id, name };
    }

    static async update ({ id, data }) {
        const fields = Object.keys(data);
        if (fields.length === 0) return null;

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = Object.values(data);

        const [result] = await pool.query(
            `UPDATE categories
             SET ${setClause}
             WHERE id = UUID_TO_BIN(?)`,
            [...values, id]
        );

        if (result.affectedRows === 0) return null;

        return this.getById({ id });
    }

    static async delete ({ id }) {
        const [rows] = await pool.query(
            `SELECT BIN_TO_UUID(id) AS id, name FROM categories WHERE id = UUID_TO_BIN(?)`,
            [id]
        );

        if (rows.length === 0) return null;

        const category = rows[0];

        await pool.query(
            `DELETE FROM categories WHERE id = UUID_TO_BIN(?)`,
            [id]
        );

        return category;
    }
}
