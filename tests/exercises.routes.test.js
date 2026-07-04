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

const exerciseData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Push Up',
  instructions: 'Do a push up',
  benefits: 'Chest strength',
  category_name: 'Strength',
}

describe('DELETE /exercises/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 and the deleted exercise on successful soft delete', async () => {
    // SELECT: find the active exercise
    mockQuery.mockResolvedValueOnce([[{ ...exerciseData, is_active: 1 }], []])
    // UPDATE: soft delete
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const res = await request(app)
      .delete(`/exercises/${exerciseData.id}`)
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200)

    expect(res.body).toEqual(exerciseData)
  })

  it('returns 404 when deleting a nonexistent exercise', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const res = await request(app)
      .delete('/exercises/nonexistent-uuid')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(404)

    expect(res.body).toHaveProperty('message')
  })

  it('returns 404 when deleting an already soft-deleted exercise', async () => {
    mockQuery.mockResolvedValueOnce([[{ ...exerciseData, is_active: 0 }], []])

    const res = await request(app)
      .delete(`/exercises/${exerciseData.id}`)
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(404)

    expect(res.body).toHaveProperty('message')
  })
})

describe('PATCH /exercises/:id/restore', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 and the restored exercise on successful restore', async () => {
    // UPDATE: set is_active = TRUE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])
    // SELECT via getById: return the restored exercise
    mockQuery.mockResolvedValueOnce([[{ ...exerciseData }], []])

    const res = await request(app)
      .patch(`/exercises/${exerciseData.id}/restore`)
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200)

    expect(res.body).toEqual(exerciseData)
  })

  it('returns 404 when restoring a nonexistent exercise', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const res = await request(app)
      .patch('/exercises/nonexistent-uuid/restore')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(404)

    expect(res.body).toHaveProperty('message')
  })

  it('returns 404 when restoring an already active exercise', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const res = await request(app)
      .patch(`/exercises/${exerciseData.id}/restore`)
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(404)

    expect(res.body).toHaveProperty('message')
  })
})
