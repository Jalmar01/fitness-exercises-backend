/**
 * Migration: Add auth columns to users table.
 *
 * Adds role, refresh_token, refresh_token_created_at, and is_active
 * columns to support JWT auth and RBAC.
 */
export async function up(knex) {
  await knex.raw(`
    ALTER TABLE users
      ADD COLUMN role ENUM('super_admin', 'admin', 'user') NOT NULL DEFAULT 'user',
      ADD COLUMN refresh_token VARCHAR(36) DEFAULT NULL,
      ADD COLUMN refresh_token_created_at TIMESTAMP NULL DEFAULT NULL,
      ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE
  `);
}

export async function down(knex) {
  await knex.raw(`
    ALTER TABLE users
      DROP COLUMN role,
      DROP COLUMN refresh_token,
      DROP COLUMN refresh_token_created_at,
      DROP COLUMN is_active
  `);
}
