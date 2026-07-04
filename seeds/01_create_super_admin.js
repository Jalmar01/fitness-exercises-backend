import bcrypt from 'bcryptjs';

/**
 * Seed: Create the initial super_admin user from environment variables.
 *
 * Idempotent — skips if a super_admin already exists.
 */
export async function seed(knex) {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@gymtracker.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  const existing = await knex.raw(
    'SELECT BIN_TO_UUID(id) AS id FROM users WHERE email = ?',
    [email]
  );

  if (existing[0].length > 0) {
    console.log(`Super admin user "${email}" already exists — skipping seed`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await knex.raw(
    `INSERT INTO users (id, name, email, password, role, is_active)
     VALUES (UUID_TO_BIN(UUID()), ?, ?, ?, 'super_admin', TRUE)`,
    [name, email, hashedPassword]
  );

  console.log(`Super admin user created: ${email}`);
}
