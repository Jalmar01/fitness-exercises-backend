import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'

const mockQuery = vi.hoisted(() => vi.fn())

vi.mock('../config/db.js', () => ({
  default: {
    query: mockQuery,
  },
}))

import { generateTestToken } from './helpers/auth.js'
import app from '../index.js'

const hashedPassword = bcrypt.hashSync('password123', 10)
const testUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test User',
  email: 'test@example.com',
  password: hashedPassword,
  role: 'user',
  is_active: 1,
}

describe('POST /auth/register', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 201 with tokens and user on successful registration', async () => {
    // findByEmail: no existing user
    mockQuery.mockResolvedValueOnce([[], []])
    // create: insert user
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])
    // updateRefreshToken
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Test User', email: 'new@example.com', password: 'password123' })
      .expect(201)

    expect(res.body).toHaveProperty('accessToken')
    expect(res.body).toHaveProperty('refreshToken')
    expect(res.body.user).toMatchObject({
      name: 'Test User',
      email: 'new@example.com',
      role: 'user',
    })
    expect(res.body.user).toHaveProperty('id')
  })

  it('returns 409 when email is already registered', async () => {
    mockQuery.mockResolvedValueOnce([[testUser], []])

    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Test User', email: testUser.email, password: 'password123' })
      .expect(409)

    expect(res.body).toHaveProperty('message', 'Email already registered')
  })

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Test User', password: 'password123' })
      .expect(400)

    expect(res.body).toHaveProperty('error')
  })
})

describe('POST /auth/login', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 with tokens on successful login', async () => {
    mockQuery.mockResolvedValueOnce([[testUser], []])
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: 'password123' })
      .expect(200)

    expect(res.body).toHaveProperty('accessToken')
    expect(res.body).toHaveProperty('refreshToken')
    expect(res.body.user).toMatchObject({
      id: testUser.id,
      name: testUser.name,
      email: testUser.email,
      role: testUser.role,
    })
  })

  it('returns 401 with wrong password', async () => {
    mockQuery.mockResolvedValueOnce([[testUser], []])

    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' })
      .expect(401)

    expect(res.body).toHaveProperty('message', 'Invalid credentials')
  })

  it('returns 401 with non-existent email', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'password123' })
      .expect(401)

    expect(res.body).toHaveProperty('message', 'Invalid credentials')
  })
})

describe('POST /auth/refresh', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 with a new access token for a valid refresh token', async () => {
    const userWithRefreshToken = {
      ...testUser,
      refresh_token: 'valid-refresh-token',
      refresh_token_created_at: new Date().toISOString(),
    }

    mockQuery.mockResolvedValueOnce([[userWithRefreshToken], []])

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token' })
      .expect(200)

    expect(res.body).toHaveProperty('accessToken')
  })

  it('returns 401 with an invalid refresh token', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'invalid-refresh-token' })
      .expect(401)

    expect(res.body).toHaveProperty('message', 'Invalid refresh token')
  })

  it('returns 401 when refresh token is expired', async () => {
    const expiredDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
    const userWithExpiredToken = {
      ...testUser,
      refresh_token: 'expired-refresh-token',
      refresh_token_created_at: expiredDate.toISOString(),
    }

    mockQuery.mockResolvedValueOnce([[userWithExpiredToken], []])
    // updateRefreshToken to clear expired token
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'expired-refresh-token' })
      .expect(401)

    expect(res.body).toHaveProperty('message', 'Refresh token expired')
  })
})

describe('POST /auth/logout', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 when authenticated', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const token = generateTestToken('user')

    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)

    expect(res.body).toHaveProperty('message', 'Logged out successfully')
  })

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .expect(401)

    expect(res.body).toHaveProperty('message')
  })
})
