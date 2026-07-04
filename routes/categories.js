import express from 'express';
import { categorySchema, validatePartialCategory } from '../schemas/category.js';
import { CategoryModel } from '../models/category.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const categories = await CategoryModel.getAll({ page, limit });
    res.status(200).json(categories);
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const category = await CategoryModel.getById({ id });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
});

router.post('/', async (req, res) => {
    const result = categorySchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: JSON.parse(result.error.message) });

    const newCategory = await CategoryModel.create({ ...result.data });
    res.status(201).json(newCategory);
});

router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const result = validatePartialCategory(req.body);
    if (!result.success) return res.status(400).json({ error: JSON.parse(result.error.message) });

    const data = result.data;
    const updatedCategory = await CategoryModel.update({ id, data });
    if (!updatedCategory) return res.status(404).json({ message: 'Category not found' });

    res.status(200).json(updatedCategory);
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const category = await CategoryModel.delete({ id });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.status(200).json(category);
});

export default router;
