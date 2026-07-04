import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

const mockQuery = vi.hoisted(() => vi.fn())

vi.mock('../config/db.js', () => ({
  default: {
    query: mockQuery,
  },
}))

import { generateTestToken } from './helpers/auth.js'
import app from '../index.js'

const adminToken = generateTestToken('admin')

const muscleData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Quadriceps',
}

describe('GET /muscles', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 with paginated data', async () => {
    const rows = [
      { id: muscleData.id, name: muscleData.name },
      { id: 'uuid-2', name: 'Hamstrings' },
    ]
    // COUNT with is_active filter
    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []])
    // SELECT with is_active filter
    mockQuery.mockResolvedValueOnce([rows, []])

    const res = await request(app)
      .get('/muscles')
      .expect(200)

    expect(res.body).toEqual({
      data: rows,
      total: 2,
      page: 1,
      limit: 10,
    })
  })

  it('uses default page and limit when no query params', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []])
    mockQuery.mockResolvedValueOnce([[], []])

    const res = await request(app)
      .get('/muscles')
      .expect(200)

    expect(res.body).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    })
  })

  it('excludes soft-deleted muscles', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []])
    mockQuery.mockResolvedValueOnce([[{ id: muscleData.id, name: muscleData.name }], []])

    const res = await request(app)
      .get('/muscles')
      .expect(200)

    expect(res.body.data).toHaveLength(1)
    expect(res.body.total).toBe(1)
  })
})

describe('GET /muscles/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 with the muscle', async () => {
    mockQuery.mockResolvedValueOnce([[{ ...muscleData }], []])

    const res = await request(app)
      .get(`/muscles/${muscleData.id}`)
      .expect(200)

    expect(res.body).toEqual(muscleData)
  })

  it('returns 404 for a nonexistent muscle', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const res = await request(app)
      .get('/muscles/nonexistent-uuid')
      .expect(404)

    expect(res.body).toHaveProperty('message', 'Muscle not found')
  })

  it('returns 404 when muscle is soft-deleted', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const res = await request(app)
      .get(`/muscles/${muscleData.id}`)
      .expect(404)

    expect(res.body).toHaveProperty('message', 'Muscle not found')
  })
})

describe('POST /muscles', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 201 with the created muscle', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const res = await request(app)
      .post('/muscles')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ name: 'Quadriceps' })
      .expect(201)

    expect(res.body).toHaveProperty('id')
    expect(res.body.name).toBe('Quadriceps')
  })

  it('returns 400 when name is too short', async () => {
    const res = await request(app)
      .post('/muscles')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ name: 'A' }) // min 2 chars
      .expect(400)

    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when name is too long', async () => {
    const res = await request(app)
      .post('/muscles')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ name: 'A'.repeat(26) }) // max 25 chars
      .expect(400)

    expect(res.body).toHaveProperty('error')
  })

  it('returns 409 on duplicate name', async () => {
    const dupError = new Error('Duplicate entry')
    dupError.code = 'ER_DUP_ENTRY'
    mockQuery.mockRejectedValueOnce(dupError)

    const res = await request(app)
      .post('/muscles')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ name: 'Quadriceps' })
      .expect(409)

    expect(res.body).toHaveProperty('message', 'Muscle with this name already exists')
  })
})

describe('PATCH /muscles/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 with the updated muscle', async () => {
    // UPDATE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])
    // SELECT via getById
    mockQuery.mockResolvedValueOnce([[{ ...muscleData, name: 'Hamstrings' }], []])

    const res = await request(app)
      .patch(`/muscles/${muscleData.id}`)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ name: 'Hamstrings' })
      .expect(200)

    expect(res.body).toEqual({ ...muscleData, name: 'Hamstrings' })
  })

  it('returns 404 for a nonexistent muscle', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const res = await request(app)
      .patch('/muscles/nonexistent-uuid')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ name: 'Test' })
      .expect(404)

    expect(res.body).toHaveProperty('message', 'Muscle not found')
  })

  it('returns 409 on duplicate name during update', async () => {
    const dupError = new Error('Duplicate entry')
    dupError.code = 'ER_DUP_ENTRY'
    mockQuery.mockRejectedValueOnce(dupError)

    const res = await request(app)
      .patch(`/muscles/${muscleData.id}`)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ name: 'Quadriceps' })
      .expect(409)

    expect(res.body).toHaveProperty('message', 'Muscle with this name already exists')
  })
})

describe('DELETE /muscles/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 with the deleted muscle on successful soft delete', async () => {
    // SELECT: find the muscle (no is_active filter)
    mockQuery.mockResolvedValueOnce([[{ id: muscleData.id, name: muscleData.name, is_active: 1 }], []])
    // UPDATE: soft delete
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const res = await request(app)
      .delete(`/muscles/${muscleData.id}`)
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200)

    expect(res.body).toEqual({ id: muscleData.id, name: muscleData.name })
  })

  it('returns 404 when deleting a nonexistent muscle', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const res = await request(app)
      .delete('/muscles/nonexistent-uuid')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(404)

    expect(res.body).toHaveProperty('message', 'Muscle not found')
  })

  it('returns 404 when muscle is already soft-deleted', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: muscleData.id, name: muscleData.name, is_active: 0 }], []])

    const res = await request(app)
      .delete(`/muscles/${muscleData.id}`)
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(404)

    expect(res.body).toHaveProperty('message', 'Muscle not found')
  })
})
