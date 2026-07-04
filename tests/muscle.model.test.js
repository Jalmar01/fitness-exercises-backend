import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.hoisted(() => vi.fn())

vi.mock('../config/db.js', () => ({
  default: {
    query: mockQuery,
  },
}))

import { MuscleModel } from '../models/muscle.js'

const activeMuscle = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Quadriceps',
}

describe('MuscleModel.getAll', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns paginated result with default page and limit', async () => {
    const rows = [
      { id: activeMuscle.id, name: 'Quadriceps' },
      { id: 'uuid-2', name: 'Hamstrings' },
    ]
    // First call: COUNT query with is_active filter
    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []])
    // Second call: SELECT with LIMIT/OFFSET and is_active filter
    mockQuery.mockResolvedValueOnce([rows, []])

    const result = await MuscleModel.getAll({})

    expect(result).toEqual({
      data: rows,
      total: 2,
      page: 1,
      limit: 10,
    })
    expect(mockQuery).toHaveBeenCalledTimes(2)

    // Verify is_active filter in COUNT
    expect(mockQuery.mock.calls[0][0]).toContain('is_active = TRUE')
    // Verify is_active filter in SELECT
    expect(mockQuery.mock.calls[1][0]).toContain('is_active = TRUE')
  })

  it('handles empty table', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []])
    mockQuery.mockResolvedValueOnce([[], []])

    const result = await MuscleModel.getAll({})

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    })
  })

  it('uses custom page and limit', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 25 }], []])
    mockQuery.mockResolvedValueOnce([[{ id: 'uuid-1', name: 'A' }], []])

    const result = await MuscleModel.getAll({ page: 2, limit: 5 })

    expect(result).toEqual({
      data: [{ id: 'uuid-1', name: 'A' }],
      total: 25,
      page: 2,
      limit: 5,
    })
  })

  it('clamps limit to maximum of 100', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 25 }], []])
    mockQuery.mockResolvedValueOnce([[], []])

    await MuscleModel.getAll({ page: 1, limit: 200 })

    const selectCall = mockQuery.mock.calls[1]
    expect(selectCall[1]).toContain(100)
  })

  it('excludes soft-deleted muscles', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 3 }], []])
    mockQuery.mockResolvedValueOnce([[{ id: 'uuid-1', name: 'Active' }], []])

    const result = await MuscleModel.getAll({ page: 1, limit: 10 })

    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(3)
    // Verify COUNT uses is_active = TRUE
    expect(mockQuery.mock.calls[0][0]).toContain('is_active = TRUE')
  })
})

describe('MuscleModel.getById', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns a muscle for a valid id', async () => {
    mockQuery.mockResolvedValueOnce([[{ ...activeMuscle }], []])

    const result = await MuscleModel.getById({ id: activeMuscle.id })

    expect(result).toEqual(activeMuscle)
  })

  it('returns null for a nonexistent id', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const result = await MuscleModel.getById({ id: 'nonexistent-uuid' })

    expect(result).toBeNull()
  })

  it('returns null when muscle is soft-deleted', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const result = await MuscleModel.getById({ id: activeMuscle.id })

    expect(result).toBeNull()
  })
})

describe('MuscleModel.create', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('creates and returns a muscle with UUID', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const result = await MuscleModel.create({ name: 'Quadriceps' })

    expect(result).toHaveProperty('id')
    expect(result.name).toBe('Quadriceps')
    expect(mockQuery).toHaveBeenCalledTimes(1)

    const insertCall = mockQuery.mock.calls[0]
    expect(insertCall[0]).toContain('INSERT INTO muscles')
    expect(insertCall[0]).toContain('UUID_TO_BIN')
    expect(insertCall[1].length).toBe(2)
    expect(insertCall[1][1]).toBe('Quadriceps')
  })

  it('throws an error on duplicate name', async () => {
    const dupError = new Error('Duplicate entry')
    dupError.code = 'ER_DUP_ENTRY'
    mockQuery.mockRejectedValueOnce(dupError)

    await expect(MuscleModel.create({ name: 'Quadriceps' }))
      .rejects
      .toThrow('Muscle with this name already exists')
  })
})

describe('MuscleModel.update', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('updates fields and returns the updated muscle', async () => {
    // First call: UPDATE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])
    // Second call: getById returns updated data
    mockQuery.mockResolvedValueOnce([[{ ...activeMuscle, name: 'Hamstrings' }], []])

    const result = await MuscleModel.update({ id: activeMuscle.id, data: { name: 'Hamstrings' } })

    expect(result).toEqual({ ...activeMuscle, name: 'Hamstrings' })
    expect(mockQuery).toHaveBeenCalledTimes(2)

    const updateCall = mockQuery.mock.calls[0]
    expect(updateCall[0]).toContain('UPDATE muscles')
    expect(updateCall[0]).toContain('SET')
    expect(updateCall[1]).toContain(activeMuscle.id)
    // Verify is_active = TRUE in WHERE
    expect(updateCall[0]).toContain('is_active = TRUE')
  })

  it('returns null when updating a nonexistent muscle', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const result = await MuscleModel.update({ id: 'nonexistent-uuid', data: { name: 'Test' } })

    expect(result).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('throws an error on duplicate name during update', async () => {
    const dupError = new Error('Duplicate entry')
    dupError.code = 'ER_DUP_ENTRY'
    mockQuery.mockRejectedValueOnce(dupError)

    await expect(MuscleModel.update({ id: activeMuscle.id, data: { name: 'Quadriceps' } }))
      .rejects
      .toThrow('Muscle with this name already exists')
  })
})

describe('MuscleModel.delete', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('soft-deletes an active muscle and returns it', async () => {
    // First call: SELECT the muscle (no is_active filter)
    mockQuery.mockResolvedValueOnce([[{ id: activeMuscle.id, name: activeMuscle.name, is_active: 1 }], []])
    // Second call: UPDATE is_active = FALSE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const result = await MuscleModel.delete({ id: activeMuscle.id })

    expect(result).toEqual(activeMuscle)
    expect(mockQuery).toHaveBeenCalledTimes(2)

    const updateCall = mockQuery.mock.calls[1]
    expect(updateCall[0]).toContain('UPDATE muscles')
    expect(updateCall[0]).toContain('is_active = FALSE')
    expect(updateCall[1]).toEqual([activeMuscle.id])
  })

  it('returns null for a nonexistent muscle', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const result = await MuscleModel.delete({ id: 'nonexistent-uuid' })

    expect(result).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('returns null when muscle is already soft-deleted', async () => {
    mockQuery.mockResolvedValueOnce([[{ ...activeMuscle, is_active: 0 }], []])

    const result = await MuscleModel.delete({ id: activeMuscle.id })

    expect(result).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})
