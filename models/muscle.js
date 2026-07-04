import pool from '../config/db.js';
import { randomUUID } from 'node:crypto';

export class MuscleModel {
    static async getAll ({ page = 1, limit = 10 } = {}) {
        const clampedLimit = Math.min(Math.max(1, limit), 100);
        const offset = (page - 1) * clampedLimit;

        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) AS total FROM muscles WHERE is_active = TRUE'
        );

        const [rows] = await pool.query(
            `SELECT BIN_TO_UUID(m.id) AS id, m.name
             FROM muscles m
             WHERE m.is_active = TRUE
             ORDER BY m.name
             LIMIT ? OFFSET ?`,
            [clampedLimit, offset]
        );

        return { data: rows, total, page, limit: clampedLimit };
    }

    static async getById ({ id }) {
        const [rows] = await pool.query(
            `SELECT BIN_TO_UUID(m.id) AS id, m.name
             FROM muscles m
             WHERE m.id = UUID_TO_BIN(?) AND m.is_active = TRUE`,
            [id]
        );

        if (rows.length === 0) return null;
        return rows[0];
    }

    static async create ({ name }) {
        const id = randomUUID();

        try {
            await pool.query(
                `INSERT INTO muscles (id, name)
                 VALUES (UUID_TO_BIN(?), ?)`,
                [id, name]
            );
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw new Error('Muscle with this name already exists');
            }
            throw err;
        }

        return { id, name };
    }

    static async update ({ id, data }) {
        const fields = Object.keys(data);
        if (fields.length === 0) return null;

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = Object.values(data);

        try {
            const [result] = await pool.query(
                `UPDATE muscles
                 SET ${setClause}
                 WHERE id = UUID_TO_BIN(?) AND is_active = TRUE`,
                [...values, id]
            );

            if (result.affectedRows === 0) return null;

            return this.getById({ id });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw new Error('Muscle with this name already exists');
            }
            throw err;
        }
    }

    static async delete ({ id }) {
        const [rows] = await pool.query(
            `SELECT BIN_TO_UUID(m.id) AS id, m.name, m.is_active
             FROM muscles m
             WHERE m.id = UUID_TO_BIN(?)`,
            [id]
        );

        if (rows.length === 0) return null;

        if (!rows[0].is_active) return null;

        const muscle = rows[0];
        delete muscle.is_active;

        await pool.query(
            `UPDATE muscles SET is_active = FALSE WHERE id = UUID_TO_BIN(?) AND is_active = TRUE`,
            [id]
        );

        return muscle;
    }
}
