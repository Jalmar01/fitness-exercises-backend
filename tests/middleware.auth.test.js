import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockVerify = vi.hoisted(() => vi.fn())

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: mockVerify,
  },
}))

import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/roles.js'

describe('authenticate middleware', () => {
  let mockReq
  let mockRes
  let mockNext

  beforeEach(() => {
    mockReq = { headers: {} }
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    mockNext = vi.fn()
    mockVerify.mockReset()
  })

  it('calls next() and sets req.user for a valid token', () => {
    mockReq.headers = { authorization: 'Bearer valid-jwt-token' }
    mockVerify.mockReturnValue({ id: 'user-1', email: 'test@example.com', role: 'admin' })

    authenticate(mockReq, mockRes, mockNext)

    expect(mockReq.user).toEqual({ id: 'user-1', email: 'test@example.com', role: 'admin' })
    expect(mockNext).toHaveBeenCalledTimes(1)
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  it('returns 401 when no Authorization header is present', () => {
    authenticate(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('returns 401 when Authorization header does not start with Bearer', () => {
    mockReq.headers = { authorization: 'Basic some-token' }

    authenticate(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('returns 401 when token is invalid', () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' }
    mockVerify.mockImplementation(() => { throw new Error('jwt malformed') })

    authenticate(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token' })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('returns 401 when token is expired', () => {
    mockReq.headers = { authorization: 'Bearer expired-token' }
    const tokenError = new Error('jwt expired')
    tokenError.name = 'TokenExpiredError'
    mockVerify.mockImplementation(() => { throw tokenError })

    authenticate(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token expired' })
    expect(mockNext).not.toHaveBeenCalled()
  })
})

describe('authorize middleware', () => {
  let mockReq
  let mockRes
  let mockNext

  beforeEach(() => {
    mockReq = {}
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    mockNext = vi.fn()
  })

  it('calls next() when role matches allowed roles', () => {
    mockReq.user = { id: 'user-1', email: 'admin@test.com', role: 'admin' }

    authorize('admin', 'super_admin')(mockReq, mockRes, mockNext)

    expect(mockNext).toHaveBeenCalledTimes(1)
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  it('returns 403 when role does not match allowed roles', () => {
    mockReq.user = { id: 'user-1', email: 'user@test.com', role: 'user' }

    authorize('admin', 'super_admin')(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('returns 401 when req.user is not set', () => {
    authorize('admin', 'super_admin')(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('accepts a single allowed role', () => {
    mockReq.user = { id: 'user-1', email: 'super@test.com', role: 'super_admin' }

    authorize('super_admin')(mockReq, mockRes, mockNext)

    expect(mockNext).toHaveBeenCalledTimes(1)
  })
})
