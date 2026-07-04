import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

const mockQuery = vi.hoisted(() => vi.fn())

vi.mock('../config/db.js', () => ({
  default: {
    query: mockQuery,
  },
}))

import { ExerciseModel } from '../models/exercise.js'
import app from '../index.js'

const exerciseId = '550e8400-e29b-41d4-a716-446655440000'
const muscleId = '660e8400-e29b-41d4-a716-446655440001'
const muscleId2 = '770e8400-e29b-41d4-a716-446655440002'

// ─── Model Tests ──────────────────────────────────────────────────────────────

describe('ExerciseModel.getMuscles', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns muscles when exercise has associations', async () => {
    const rows = [
      { muscle_id: muscleId, name: 'Pectorals', role: 'primary' },
      { muscle_id: muscleId2, name: 'Triceps', role: 'secondary' },
    ]
    mockQuery.mockResolvedValueOnce([rows, []])

    const result = await ExerciseModel.getMuscles({ exerciseId })

    expect(result).toEqual(rows)
    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(mockQuery.mock.calls[0][0]).toContain('LEFT JOIN muscles')
  })

  it('returns empty array when exercise has no associations', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const result = await ExerciseModel.getMuscles({ exerciseId })

    expect(result).toEqual([])
  })

  it('returns empty array when exercise does not exist', async () => {
    // LEFT JOIN returns empty set when no matching exercise_id
    mockQuery.mockResolvedValueOnce([[], []])

    const result = await ExerciseModel.getMuscles({ exerciseId: 'nonexistent-uuid' })

    expect(result).toEqual([])
  })
})

describe('ExerciseModel.addMuscle', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('adds an association with primary role', async () => {
    // 1. Exercise exists check
    mockQuery.mockResolvedValueOnce([[{ id: exerciseId }], []])
    // 2. Muscle exists check
    mockQuery.mockResolvedValueOnce([[{ id: muscleId }], []])
    // 3. INSERT
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const result = await ExerciseModel.addMuscle({
      exerciseId,
      muscleId,
      role: 'primary',
    })

    expect(result).toEqual({
      exercise_id: exerciseId,
      muscle_id: muscleId,
      role: 'primary',
    })
    expect(mockQuery).toHaveBeenCalledTimes(3)
  })

  it('adds an association with secondary role', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: exerciseId }], []])
    mockQuery.mockResolvedValueOnce([[{ id: muscleId }], []])
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const result = await ExerciseModel.addMuscle({
      exerciseId,
      muscleId,
      role: 'secondary',
    })

    expect(result).toEqual({
      exercise_id: exerciseId,
      muscle_id: muscleId,
      role: 'secondary',
    })
  })

  it('throws Exercise not found when exercise does not exist', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    await expect(ExerciseModel.addMuscle({ exerciseId, muscleId, role: 'primary' }))
      .rejects
      .toThrow('Exercise not found')

    expect(mockQuery).toHaveBeenCalledTimes(1) // Only the exercise check
  })

  it('throws Muscle not found when muscle does not exist', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: exerciseId }], []])
    mockQuery.mockResolvedValueOnce([[], []])

    await expect(ExerciseModel.addMuscle({ exerciseId, muscleId, role: 'primary' }))
      .rejects
      .toThrow('Muscle not found')

    expect(mockQuery).toHaveBeenCalledTimes(2) // Exercise check + muscle check
  })

  it('throws Already associated on duplicate entry', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: exerciseId }], []])
    mockQuery.mockResolvedValueOnce([[{ id: muscleId }], []])

    const dupError = new Error('Duplicate entry')
    dupError.code = 'ER_DUP_ENTRY'
    mockQuery.mockRejectedValueOnce(dupError)

    await expect(ExerciseModel.addMuscle({ exerciseId, muscleId, role: 'primary' }))
      .rejects
      .toThrow('Already associated')

    expect(mockQuery).toHaveBeenCalledTimes(3)
  })
})

describe('ExerciseModel.updateMuscleRole', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('updates role and returns the association', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const result = await ExerciseModel.updateMuscleRole({
      exerciseId,
      muscleId,
      role: 'secondary',
    })

    expect(result).toEqual({
      exercise_id: exerciseId,
      muscle_id: muscleId,
      role: 'secondary',
    })
    expect(mockQuery).toHaveBeenCalledTimes(1)

    const updateCall = mockQuery.mock.calls[0]
    expect(updateCall[0]).toContain('UPDATE exercise_muscles')
    expect(updateCall[0]).toContain('role = ?')
  })

  it('returns null when association is not found', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const result = await ExerciseModel.updateMuscleRole({
      exerciseId,
      muscleId,
      role: 'primary',
    })

    expect(result).toBeNull()
  })
})

describe('ExerciseModel.removeMuscle', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('removes association and returns exercise_id and muscle_id', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const result = await ExerciseModel.removeMuscle({ exerciseId, muscleId })

    expect(result).toEqual({
      exercise_id: exerciseId,
      muscle_id: muscleId,
    })
    expect(mockQuery).toHaveBeenCalledTimes(1)

    const deleteCall = mockQuery.mock.calls[0]
    expect(deleteCall[0]).toContain('DELETE FROM exercise_muscles')
  })

  it('returns null when association is not found', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const result = await ExerciseModel.removeMuscle({ exerciseId, muscleId })

    expect(result).toBeNull()
  })
})

// ─── Route Tests ──────────────────────────────────────────────────────────────

describe('GET /exercises/:exerciseId/muscles', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 with muscles when exercise has associations', async () => {
    const rows = [
      { muscle_id: muscleId, name: 'Pectorals', role: 'primary' },
    ]
    mockQuery.mockResolvedValueOnce([rows, []])

    const res = await request(app)
      .get(`/exercises/${exerciseId}/muscles`)
      .expect(200)

    expect(res.body).toEqual(rows)
  })

  it('returns 200 with empty array when no associations', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const res = await request(app)
      .get(`/exercises/${exerciseId}/muscles`)
      .expect(200)

    expect(res.body).toEqual([])
  })

  it('returns 200 with empty array when exercise does not exist', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const res = await request(app)
      .get('/exercises/nonexistent-uuid/muscles')
      .expect(200)

    expect(res.body).toEqual([])
  })
})

describe('POST /exercises/:exerciseId/muscles', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 201 with the created association', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: exerciseId }], []])
    mockQuery.mockResolvedValueOnce([[{ id: muscleId }], []])
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const res = await request(app)
      .post(`/exercises/${exerciseId}/muscles`)
      .send({ muscle_id: muscleId, role: 'primary' })
      .expect(201)

    expect(res.body).toEqual({
      exercise_id: exerciseId,
      muscle_id: muscleId,
      role: 'primary',
    })
  })

  it('returns 400 when role is invalid', async () => {
    const res = await request(app)
      .post(`/exercises/${exerciseId}/muscles`)
      .send({ muscle_id: muscleId, role: 'invalid' })
      .expect(400)

    expect(res.body).toHaveProperty('error')
  })

  it('returns 404 when exercise does not exist', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const res = await request(app)
      .post(`/exercises/${exerciseId}/muscles`)
      .send({ muscle_id: muscleId, role: 'primary' })
      .expect(404)

    expect(res.body).toHaveProperty('message', 'Exercise not found')
  })

  it('returns 404 when muscle does not exist', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: exerciseId }], []])
    mockQuery.mockResolvedValueOnce([[], []])

    const res = await request(app)
      .post(`/exercises/${exerciseId}/muscles`)
      .send({ muscle_id: muscleId, role: 'primary' })
      .expect(404)

    expect(res.body).toHaveProperty('message', 'Muscle not found')
  })

  it('returns 409 when association already exists', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: exerciseId }], []])
    mockQuery.mockResolvedValueOnce([[{ id: muscleId }], []])

    const dupError = new Error('Duplicate entry')
    dupError.code = 'ER_DUP_ENTRY'
    mockQuery.mockRejectedValueOnce(dupError)

    const res = await request(app)
      .post(`/exercises/${exerciseId}/muscles`)
      .send({ muscle_id: muscleId, role: 'primary' })
      .expect(409)

    expect(res.body).toHaveProperty('message', 'Already associated')
  })
})

describe('PATCH /exercises/:exerciseId/muscles/:muscleId', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 with updated role', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const res = await request(app)
      .patch(`/exercises/${exerciseId}/muscles/${muscleId}`)
      .send({ role: 'secondary' })
      .expect(200)

    expect(res.body).toEqual({
      exercise_id: exerciseId,
      muscle_id: muscleId,
      role: 'secondary',
    })
  })

  it('returns 404 when association is not found', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const res = await request(app)
      .patch(`/exercises/${exerciseId}/muscles/${muscleId}`)
      .send({ role: 'primary' })
      .expect(404)

    expect(res.body).toHaveProperty('message', 'Association not found')
  })

  it('returns 400 when role is invalid', async () => {
    const res = await request(app)
      .patch(`/exercises/${exerciseId}/muscles/${muscleId}`)
      .send({ role: 'invalid' })
      .expect(400)

    expect(res.body).toHaveProperty('error')
  })
})

describe('DELETE /exercises/:exerciseId/muscles/:muscleId', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns 200 with removed association info', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const res = await request(app)
      .delete(`/exercises/${exerciseId}/muscles/${muscleId}`)
      .expect(200)

    expect(res.body).toEqual({
      exercise_id: exerciseId,
      muscle_id: muscleId,
    })
  })

  it('returns 404 when association is not found', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const res = await request(app)
      .delete(`/exercises/${exerciseId}/muscles/${muscleId}`)
      .expect(404)

    expect(res.body).toHaveProperty('message', 'Association not found')
  })
})
