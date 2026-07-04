import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.hoisted(() => vi.fn())

vi.mock('../config/db.js', () => ({
  default: {
    query: mockQuery,
  },
}))

import { CategoryModel } from '../models/category.js'

const activeCategory = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Strength',
  exercise_count: 0,
}

describe('CategoryModel.getAll', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns paginated result with default page and limit', async () => {
    const rows = [
      { id: activeCategory.id, name: 'Strength', exercise_count: 0 },
      { id: 'uuid-2', name: 'Cardio', exercise_count: 0 },
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
    mockQuery.mockResolvedValueOnce([[{ id: 'uuid-1', name: 'A', exercise_count: 0 }], []])

    const result = await CategoryModel.getAll({ page: 2, limit: 5 })

    expect(result).toEqual({
      data: [{ id: 'uuid-1', name: 'A', exercise_count: 0 }],
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
    mockQuery.mockResolvedValueOnce([[{ ...activeCategory }], []])

    const result = await CategoryModel.getById({ id: activeCategory.id })

    expect(result).toEqual(activeCategory)
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

    const result = await CategoryModel.create({ name: 'Strength' })

    expect(result).toHaveProperty('id')
    expect(result.name).toBe('Strength')
    expect(mockQuery).toHaveBeenCalledTimes(1)

    // Verify INSERT query structure
    const insertCall = mockQuery.mock.calls[0]
    expect(insertCall[0]).toContain('INSERT INTO categories')
    expect(insertCall[0]).toContain('UUID_TO_BIN')
    // Params: [id, name]
    expect(insertCall[1].length).toBe(2)
    expect(insertCall[1][1]).toBe('Strength')
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
    mockQuery.mockResolvedValueOnce([[{ ...activeCategory, name: 'Hypertrophy' }], []])

    const result = await CategoryModel.update({ id: activeCategory.id, data: { name: 'Hypertrophy' } })

    expect(result).toEqual({ ...activeCategory, name: 'Hypertrophy' })
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
  })

  it('deletes a category and returns it', async () => {
    // First call: SELECT the category
    mockQuery.mockResolvedValueOnce([[{ id: activeCategory.id, name: activeCategory.name }], []])
    // Second call: DELETE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []])

    const result = await CategoryModel.delete({ id: activeCategory.id })

    expect(result).toEqual({ id: activeCategory.id, name: activeCategory.name })
    expect(mockQuery).toHaveBeenCalledTimes(2)

    // Verify DELETE query
    const deleteCall = mockQuery.mock.calls[1]
    expect(deleteCall[0]).toContain('DELETE FROM categories')
    expect(deleteCall[1]).toEqual([activeCategory.id])
  })

  it('returns null for a nonexistent category', async () => {
    mockQuery.mockResolvedValueOnce([[], []])

    const result = await CategoryModel.delete({ id: 'nonexistent-uuid' })

    expect(result).toBeNull()
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})
