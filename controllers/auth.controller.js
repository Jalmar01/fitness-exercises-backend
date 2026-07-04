import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { UserModel } from '../models/user.js';
import { registerSchema, loginSchema, refreshSchema } from '../schemas/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production';
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
}

export class AuthController {
  /**
   * POST /auth/register
   * Create a new user account with role 'user'.
   */
  static async register(req, res) {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: JSON.parse(result.error.message) });
    }

    const { name, email, password } = result.data;

    const existing = await UserModel.findByEmail({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = await UserModel.create({ name, email, password, role: 'user' });

    const accessToken = generateAccessToken(user);
    const refreshToken = randomUUID();

    await UserModel.updateRefreshToken({ id: user.id, refreshToken });

    res.status(201).json({ accessToken, refreshToken, user });
  }

  /**
   * POST /auth/login
   * Authenticate with email and password.
   */
  static async login(req, res) {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: JSON.parse(result.error.message) });
    }

    const { email, password } = result.data;

    const user = await UserModel.findByEmail({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = randomUUID();

    await UserModel.updateRefreshToken({ id: user.id, refreshToken });

    res.status(200).json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  }

  /**
   * POST /auth/refresh
   * Issue a new access token using a valid refresh token.
   */
  static async refresh(req, res) {
    const result = refreshSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: JSON.parse(result.error.message) });
    }

    const { refreshToken } = result.data;

    const user = await UserModel.findByRefreshToken({ refreshToken });
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Check if the refresh token has expired (application-level check)
    if (user.refresh_token_created_at) {
      const age = Date.now() - new Date(user.refresh_token_created_at).getTime();
      if (age > REFRESH_TOKEN_EXPIRES_MS) {
        // Clear expired token
        await UserModel.updateRefreshToken({ id: user.id, refreshToken: null });
        return res.status(401).json({ message: 'Refresh token expired' });
      }
    }

    const accessToken = generateAccessToken(user);

    res.status(200).json({ accessToken });
  }

  /**
   * POST /auth/logout
   * Invalidate the current refresh token.
   * Requires authenticate middleware.
   */
  static async logout(req, res) {
    // req.user is set by authenticate middleware
    await UserModel.updateRefreshToken({ id: req.user.id, refreshToken: null });

    res.status(200).json({ message: 'Logged out successfully' });
  }
}
