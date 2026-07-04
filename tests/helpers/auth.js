import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production';

/**
 * Generate a valid JWT token for testing.
 * @param {string} role - User role (default: 'admin')
 * @returns {string} Signed JWT token
 */
export function generateTestToken(role = 'admin') {
  return jwt.sign(
    { id: 'test-user-id', email: 'admin@test.com', role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}
