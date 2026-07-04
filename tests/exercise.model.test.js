import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.hoisted(() => vi.fn())

vi.mock('../config/db.js', () => ({
  default: {
    query: mockQuery,
  },
}))

import { ExerciseModel } from '../models/exercise.js'

const activeExercise = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Push Up',
  instructions: 'Do a push up',
  benefits: 'Chest strength',
  category_name: 'Strength',
}

const inactiveExercise = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Squat',
  instructions: 'Do a squat',
  benefits: 'Leg strength',
  category_name: 'Strength',
  is_active: 0,
}

describe('ExerciseModel.delete', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns the exercise when soft-deleting an active exercise', async () => {
    // First call: SELECT the exercise (no is_active filter)
    mockQuery.mockResolvedValueOnce([[{ ...activeExercise, is_active: 1 }], []])
    // Second call: UPDATE is_active = FALSE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const result = await ExerciseModel.delete({ id: activeExercise.id })

    expect(result).toEqual(activeExercise)
    expect(mockQuery).toHaveBeenCalledTimes(2)

    // Verify the UPDATE query targets the correct id
    const updateCall = mockQuery.mock.calls[1]
    expect(updateCall[0]).toContain('UPDATE exercises')
    expect(updateCall[0]).toContain('is_active = FALSE')
    expect(updateCall[1]).toEqual([activeExercise.id])
  })

  it('returns null when the exercise id does not exist', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const result = await ExerciseModel.delete({ id: 'nonexistent-uuid' })

    expect(result).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('returns null when the exercise is already soft-deleted', async () => {
    mockQuery.mockResolvedValueOnce([[inactiveExercise], []])

    const result = await ExerciseModel.delete({ id: inactiveExercise.id })

    expect(result).toBeNull()
    // Should not proceed to UPDATE
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})

describe('ExerciseModel.restore', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns the exercise when restoring a soft-deleted exercise', async () => {
    // First call: UPDATE is_active = TRUE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])
    // Second call: SELECT via getById
    mockQuery.mockResolvedValueOnce([[{ ...activeExercise }], []])

    const result = await ExerciseModel.restore({ id: activeExercise.id })

    expect(result).toEqual(activeExercise)
    expect(mockQuery).toHaveBeenCalledTimes(2)

    // Verify UPDATE query
    const updateCall = mockQuery.mock.calls[0]
    expect(updateCall[0]).toContain('UPDATE exercises')
    expect(updateCall[0]).toContain('is_active = TRUE')
    expect(updateCall[1]).toEqual([activeExercise.id])
  })

  it('returns null when the exercise id does not exist', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const result = await ExerciseModel.restore({ id: 'nonexistent-uuid' })

    expect(result).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('returns null when the exercise is already active', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const result = await ExerciseModel.restore({ id: activeExercise.id })

    expect(result).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})
