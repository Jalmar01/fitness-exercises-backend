import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.hoisted(() => vi.fn())

vi.mock('../config/db.js', () => ({
  default: {
    query: mockQuery,
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

import { UserModel } from '../models/user.js'
import bcrypt from 'bcryptjs'

const testUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashed-password-123',
  role: 'user',
  is_active: 1,
}

describe('UserModel.findByEmail', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns user when email exists', async () => {
    mockQuery.mockResolvedValueOnce([[testUser], []])

    const result = await UserModel.findByEmail({ email: testUser.email })

    expect(result).toEqual(testUser)
    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(mockQuery.mock.calls[0][0]).toContain('SELECT BIN_TO_UUID(id)')
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE email = ?')
    expect(mockQuery.mock.calls[0][1]).toEqual([testUser.email])
  })

  it('returns null when email does not exist', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const result = await UserModel.findByEmail({ email: 'nonexistent@example.com' })

    expect(result).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})

describe('UserModel.findById', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns user when id exists', async () => {
    mockQuery.mockResolvedValueOnce([[testUser], []])

    const result = await UserModel.findById({ id: testUser.id })

    expect(result).toEqual(testUser)
    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(mockQuery.mock.calls[0][0]).toContain('SELECT BIN_TO_UUID(id)')
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE id = UUID_TO_BIN(?)')
    expect(mockQuery.mock.calls[0][1]).toEqual([testUser.id])
  })

  it('returns null when id does not exist', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const result = await UserModel.findById({ id: 'nonexistent-uuid' })

    expect(result).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})

describe('UserModel.create', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    vi.mocked(bcrypt.hash).mockReset()
  })

  it('creates a user with hashed password and returns user object', async () => {
    const newUser = { name: 'New User', email: 'new@example.com', password: 'plain-password', role: 'user' }

    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password-456')
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const result = await UserModel.create(newUser)

    expect(result).toHaveProperty('id')
    expect(result.name).toBe('New User')
    expect(result.email).toBe('new@example.com')
    expect(result.role).toBe('user')
    expect(result).not.toHaveProperty('password')

    expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 10)

    expect(mockQuery).toHaveBeenCalledTimes(1)
    const insertCall = mockQuery.mock.calls[0]
    expect(insertCall[0]).toContain('INSERT INTO users')
    expect(insertCall[0]).toContain('UUID_TO_BIN(?)')
    // Verify hashed password was stored
    expect(insertCall[1]).toContain('hashed-password-456')
  })

  it('defaults role to user when not provided', async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password-789')
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const result = await UserModel.create({ name: 'Default', email: 'default@example.com', password: 'password' })

    expect(result.role).toBe('user')
  })
})

describe('UserModel.updateRefreshToken', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('stores a refresh token', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    await UserModel.updateRefreshToken({ id: testUser.id, refreshToken: 'some-refresh-token' })

    expect(mockQuery).toHaveBeenCalledTimes(1)
    const updateCall = mockQuery.mock.calls[0]
    expect(updateCall[0]).toContain('UPDATE users')
    expect(updateCall[0]).toContain('refresh_token = ?')
    expect(updateCall[1]).toEqual(['some-refresh-token', 'some-refresh-token', testUser.id])
  })

  it('clears refresh token when null', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    await UserModel.updateRefreshToken({ id: testUser.id, refreshToken: null })

    expect(mockQuery).toHaveBeenCalledTimes(1)
    const updateCall = mockQuery.mock.calls[0]
    expect(updateCall[1]).toEqual([null, null, testUser.id])
  })
})

describe('UserModel.findByRefreshToken', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns user when refresh token matches', async () => {
    const userWithToken = {
      id: testUser.id,
      name: testUser.name,
      email: testUser.email,
      role: testUser.role,
      refresh_token: 'valid-refresh-token',
      refresh_token_created_at: new Date().toISOString(),
    }

    mockQuery.mockResolvedValueOnce([[userWithToken], []])

    const result = await UserModel.findByRefreshToken({ refreshToken: 'valid-refresh-token' })

    expect(result).toEqual(userWithToken)
    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(mockQuery.mock.calls[0][0]).toContain('SELECT BIN_TO_UUID(id)')
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE refresh_token = ?')
    expect(mockQuery.mock.calls[0][1]).toEqual(['valid-refresh-token'])
  })

  it('returns null when refresh token does not match', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const result = await UserModel.findByRefreshToken({ refreshToken: 'invalid-refresh-token' })

    expect(result).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})
