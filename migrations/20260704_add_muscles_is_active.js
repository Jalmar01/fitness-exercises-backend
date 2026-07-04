/**
 * Migration: Add is_active column to muscles table for soft delete support.
 */
export async function up(knex) {
  await knex.raw('ALTER TABLE muscles ADD COLUMN is_active BOOLEAN DEFAULT TRUE');
}

export async function down(knex) {
  await knex.raw('ALTER TABLE muscles DROP COLUMN is_active');
}
