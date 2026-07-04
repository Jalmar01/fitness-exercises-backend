import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

const mockQuery = vi.hoisted(() => vi.fn())

const mockConnection = vi.hoisted(() => ({
  beginTransaction: vi.fn(),
  query: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
}))

vi.mock('../config/db.js', () => ({
  default: {
    query: mockQuery,
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}))

import app from '../index.js'

const categoryData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Strength',
  description: 'Strength training exercises',
  exercise_count: 0,
}

describe('GET /categories', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 with paginated data', async () => {
    const rows = [
      { id: categoryData.id, name: categoryData.name, description: categoryData.description, exercise_count: 0 },
      { id: 'uuid-2', name: 'Cardio', description: null, exercise_count: 0 },
    ]
    // COUNT
    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []])
    // SELECT
    mockQuery.mockResolvedValueOnce([rows, []])

    const res = await request(app)
      .get('/categories')
      .expect(200)

    expect(res.body).toEqual({
      data: rows,
      total: 2,
      page: 1,
      limit: 10,
    })
  })
})

describe('GET /categories/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 with the category', async () => {
    mockQuery.mockResolvedValueOnce([[{ ...categoryData }], []])

    const res = await request(app)
      .get(`/categories/${categoryData.id}`)
      .expect(200)

    expect(res.body).toEqual(categoryData)
  })

  it('returns 404 for a nonexistent category', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const res = await request(app)
      .get('/categories/nonexistent-uuid')
      .expect(404)

    expect(res.body).toHaveProperty('message')
  })
})

describe('POST /categories', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 201 with the created category', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const res = await request(app)
      .post('/categories')
      .send({ name: 'Strength' })
      .expect(201)

    expect(res.body).toHaveProperty('id')
    expect(res.body.name).toBe('Strength')
  })

  it('returns 400 with invalid data', async () => {
    const res = await request(app)
      .post('/categories')
      .send({ name: 'A' }) // min 2 chars
      .expect(400)

    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/categories')
      .send({ description: 'Some text' })
      .expect(400)

    expect(res.body).toHaveProperty('error')
  })
})

describe('PATCH /categories/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 with the updated category', async () => {
    // UPDATE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])
    // SELECT via getById
    mockQuery.mockResolvedValueOnce([[{ ...categoryData, name: 'Hypertrophy' }], []])

    const res = await request(app)
      .patch(`/categories/${categoryData.id}`)
      .send({ name: 'Hypertrophy' })
      .expect(200)

    expect(res.body).toEqual({ ...categoryData, name: 'Hypertrophy' })
  })

  it('returns 404 for a nonexistent category', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const res = await request(app)
      .patch('/categories/nonexistent-uuid')
      .send({ name: 'Test' })
      .expect(404)

    expect(res.body).toHaveProperty('message')
  })
})

describe('DELETE /categories/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockConnection.query.mockReset()
    mockConnection.beginTransaction.mockReset()
    mockConnection.commit.mockReset()
    mockConnection.rollback.mockReset()
    mockConnection.release.mockReset()
  })

  it('returns 200 with the deleted category on successful cascade delete', async () => {
    // beginTransaction
    mockConnection.beginTransaction.mockResolvedValue(undefined)
    // SELECT: find the active category
    mockConnection.query.mockResolvedValueOnce([[{ ...categoryData, is_active: 1, exercise_count: 0 }], []])
    // UPDATE: cascade exercises
    mockConnection.query.mockResolvedValueOnce([{ affectedRows: 3 }, []])
    // UPDATE: soft delete category
    mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }, []])
    // commit
    mockConnection.commit.mockResolvedValue(undefined)

    const res = await request(app)
      .delete(`/categories/${categoryData.id}`)
      .expect(200)

    expect(res.body).toEqual(categoryData)
  })

  it('returns 404 when deleting a nonexistent category', async () => {
    mockConnection.beginTransaction.mockResolvedValue(undefined)
    mockConnection.query.mockResolvedValueOnce([[], []])

    const res = await request(app)
      .delete('/categories/nonexistent-uuid')
      .expect(404)

    expect(res.body).toHaveProperty('message')
  })

  it('returns 404 when deleting an already soft-deleted category', async () => {
    mockConnection.beginTransaction.mockResolvedValue(undefined)
    mockConnection.query.mockResolvedValueOnce([[{ ...categoryData, is_active: 0, exercise_count: 0 }], []])

    const res = await request(app)
      .delete(`/categories/${categoryData.id}`)
      .expect(404)

    expect(res.body).toHaveProperty('message')
  })
})

describe('PATCH /categories/:id/restore', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 and the restored category on successful restore', async () => {
    // UPDATE: set is_active = TRUE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])
    // SELECT via getById: return the restored category
    mockQuery.mockResolvedValueOnce([[{ ...categoryData, exercise_count: 0 }], []])

    const res = await request(app)
      .patch(`/categories/${categoryData.id}/restore`)
      .expect(200)

    expect(res.body).toEqual(categoryData)
  })

  it('returns 404 when restoring a nonexistent category', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const res = await request(app)
      .patch('/categories/nonexistent-uuid/restore')
      .expect(404)

    expect(res.body).toHaveProperty('message')
  })

  it('returns 404 when restoring an already active category', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const res = await request(app)
      .patch(`/categories/${categoryData.id}/restore`)
      .expect(404)

    expect(res.body).toHaveProperty('message')
  })
})
