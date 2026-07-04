import { describe, it, expect, vi, beforeEach } from 'vitest'

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

import { CategoryModel } from '../models/category.js'

const activeCategory = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Strength',
  description: 'Strength training exercises',
  exercise_count: 0,
}

const inactiveCategory = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Cardio',
  description: null,
  is_active: 0,
}

describe('CategoryModel.getAll', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns paginated result with default page and limit', async () => {
    const rows = [
      { id: activeCategory.id, name: 'Strength', description: 'Strength training exercises', exercise_count: 0 },
      { id: 'uuid-2', name: 'Cardio', description: null, exercise_count: 0 },
    ]
    // First call: COUNT query
    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []])
    // Second call: SELECT with LIMIT/OFFSET
    mockQuery.mockResolvedValueOnce([rows, []])

    const result = await CategoryModel.getAll({})

    expect(result).toEqual({
      data: rows,
      total: 2,
      page: 1,
      limit: 10,
    })
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('handles empty table', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []])
    mockQuery.mockResolvedValueOnce([[], []])

    const result = await CategoryModel.getAll({})

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    })
  })

  it('uses custom page and limit', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 25 }], []])
    mockQuery.mockResolvedValueOnce([[{ id: 'uuid-1', name: 'A', description: null, exercise_count: 0 }], []])

    const result = await CategoryModel.getAll({ page: 2, limit: 5 })

    expect(result).toEqual({
      data: [{ id: 'uuid-1', name: 'A', description: null, exercise_count: 0 }],
      total: 25,
      page: 2,
      limit: 5,
    })
  })

  it('clamps limit to maximum of 100', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 25 }], []])
    mockQuery.mockResolvedValueOnce([[], []])

    await CategoryModel.getAll({ page: 1, limit: 200 })

    // The SQL should use LIMIT 100, which means the second call's params contain 100
    const selectCall = mockQuery.mock.calls[1]
    expect(selectCall[1]).toContain(100)
  })
})

describe('CategoryModel.getById', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns a category for a valid id', async () => {
    mockQuery.mockResolvedValueOnce([[{ ...activeCategory, exercise_count: 0 }], []])

    const result = await CategoryModel.getById({ id: activeCategory.id })

    expect(result).toEqual({ ...activeCategory, exercise_count: 0 })
  })

  it('returns null for a nonexistent id', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const result = await CategoryModel.getById({ id: 'nonexistent-uuid' })

    expect(result).toBeNull()
  })
})

describe('CategoryModel.create', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('creates and returns a category with UUID', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const result = await CategoryModel.create({ name: 'Strength', description: null })

    expect(result).toHaveProperty('id')
    expect(result.name).toBe('Strength')
    expect(result.description).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)

    // Verify INSERT query structure
    const insertCall = mockQuery.mock.calls[0]
    expect(insertCall[0]).toContain('INSERT INTO categories')
    expect(insertCall[0]).toContain('UUID_TO_BIN')
    // Params: [id, name, description]
    expect(insertCall[1].length).toBe(3)
    expect(insertCall[1][1]).toBe('Strength')
    expect(insertCall[1][2]).toBeNull()
  })

  it('creates a category with description provided', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const result = await CategoryModel.create({ name: 'Cardio', description: 'Heart exercises' })

    expect(result).toHaveProperty('id')
    expect(result.name).toBe('Cardio')
    expect(result.description).toBe('Heart exercises')

    const insertCall = mockQuery.mock.calls[0]
    expect(insertCall[1][2]).toBe('Heart exercises')
  })
})

describe('CategoryModel.update', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('updates fields and returns the updated category', async () => {
    // First call: UPDATE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])
    // Second call: getById returns updated data
    mockQuery.mockResolvedValueOnce([[{ ...activeCategory, name: 'Hypertrophy', exercise_count: 0 }], []])

    const result = await CategoryModel.update({ id: activeCategory.id, data: { name: 'Hypertrophy' } })

    expect(result).toEqual({ ...activeCategory, name: 'Hypertrophy', exercise_count: 0 })
    expect(mockQuery).toHaveBeenCalledTimes(2)

    // Verify UPDATE query
    const updateCall = mockQuery.mock.calls[0]
    expect(updateCall[0]).toContain('UPDATE categories')
    expect(updateCall[0]).toContain('SET')
    expect(updateCall[1]).toContain(activeCategory.id)
  })

  it('returns null when updating a nonexistent category', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const result = await CategoryModel.update({ id: 'nonexistent-uuid', data: { name: 'Test' } })

    expect(result).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})

describe('CategoryModel.delete', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockConnection.query.mockReset()
    mockConnection.beginTransaction.mockReset()
    mockConnection.commit.mockReset()
    mockConnection.rollback.mockReset()
    mockConnection.release.mockReset()
  })

  it('cascade soft-deletes and returns the deleted category', async () => {
    // First call: SELECT the category (without is_active filter)
    mockConnection.query.mockResolvedValueOnce([[{ ...activeCategory, is_active: 1, exercise_count: 0 }], []])
    // Second call: UPDATE exercises (cascade)
    mockConnection.query.mockResolvedValueOnce([{ affectedRows: 3 }, []])
    // Third call: UPDATE categories (soft delete)
    mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }, []])
    // beginTransaction resolves
    mockConnection.beginTransaction.mockResolvedValue(undefined)
    // commit resolves
    mockConnection.commit.mockResolvedValue(undefined)

    const result = await CategoryModel.delete({ id: activeCategory.id })

    expect(result).toEqual(activeCategory)
    expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1)
    expect(mockConnection.query).toHaveBeenCalledTimes(3)
    expect(mockConnection.commit).toHaveBeenCalledTimes(1)
    expect(mockConnection.release).toHaveBeenCalledTimes(1)
    expect(mockConnection.rollback).not.toHaveBeenCalled()

    // Verify UPDATE exercises cascade
    const updateExercisesCall = mockConnection.query.mock.calls[1]
    expect(updateExercisesCall[0]).toContain('UPDATE exercises')
    expect(updateExercisesCall[0]).toContain('is_active = FALSE')
    expect(updateExercisesCall[1]).toEqual([activeCategory.id])

    // Verify UPDATE categories soft delete
    const updateCategoriesCall = mockConnection.query.mock.calls[2]
    expect(updateCategoriesCall[0]).toContain('UPDATE categories')
    expect(updateCategoriesCall[0]).toContain('is_active = FALSE')
    expect(updateCategoriesCall[1]).toEqual([activeCategory.id])
  })

  it('returns null for a nonexistent category', async () => {
    mockConnection.query.mockResolvedValueOnce([[], []])
    mockConnection.beginTransaction.mockResolvedValue(undefined)

    const result = await CategoryModel.delete({ id: 'nonexistent-uuid' })

    expect(result).toBeNull()
    expect(mockConnection.query).toHaveBeenCalledTimes(1)
    expect(mockConnection.rollback).toHaveBeenCalledTimes(1)
    expect(mockConnection.release).toHaveBeenCalledTimes(1)
    expect(mockConnection.commit).not.toHaveBeenCalled()
  })

  it('returns null for an already soft-deleted category', async () => {
    mockConnection.query.mockResolvedValueOnce([[inactiveCategory], []])
    mockConnection.beginTransaction.mockResolvedValue(undefined)

    const result = await CategoryModel.delete({ id: inactiveCategory.id })

    expect(result).toBeNull()
    // Should not proceed to UPDATEs
    expect(mockConnection.query).toHaveBeenCalledTimes(1)
    expect(mockConnection.rollback).toHaveBeenCalledTimes(1)
    expect(mockConnection.release).toHaveBeenCalledTimes(1)
    expect(mockConnection.commit).not.toHaveBeenCalled()
  })
})

describe('CategoryModel.restore', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('restores a soft-deleted category and returns it', async () => {
    // First call: UPDATE is_active = TRUE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])
    // Second call: getById SELECT
    mockQuery.mockResolvedValueOnce([[{ ...activeCategory, exercise_count: 0 }], []])

    const result = await CategoryModel.restore({ id: activeCategory.id })

    expect(result).toEqual({ ...activeCategory, exercise_count: 0 })
    expect(mockQuery).toHaveBeenCalledTimes(2)

    const updateCall = mockQuery.mock.calls[0]
    expect(updateCall[0]).toContain('UPDATE categories')
    expect(updateCall[0]).toContain('is_active = TRUE')
    expect(updateCall[1]).toEqual([activeCategory.id])
  })

  it('returns null for a nonexistent category', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const result = await CategoryModel.restore({ id: 'nonexistent-uuid' })

    expect(result).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('returns null for an already active category', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []])

    const result = await CategoryModel.restore({ id: activeCategory.id })

    expect(result).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})
