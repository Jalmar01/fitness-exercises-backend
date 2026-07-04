import express from 'express';
import { muscleSchema, validatePartialMuscle } from '../schemas/muscle.js';
import { MuscleModel } from '../models/muscle.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const muscles = await MuscleModel.getAll({ page, limit });
    res.status(200).json(muscles);
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const muscle = await MuscleModel.getById({ id });
    if (!muscle) return res.status(404).json({ message: 'Muscle not found' });
    res.json(muscle);
});

router.post('/', async (req, res) => {
    const result = muscleSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: JSON.parse(result.error.message) });

    try {
        const newMuscle = await MuscleModel.create({ ...result.data });
        res.status(201).json(newMuscle);
    } catch (err) {
        if (err.message && err.message === 'Muscle with this name already exists') {
            return res.status(409).json({ message: err.message });
        }
        throw err;
    }
});

router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const result = validatePartialMuscle(req.body);
    if (!result.success) return res.status(400).json({ error: JSON.parse(result.error.message) });

    const data = result.data;

    try {
        const updatedMuscle = await MuscleModel.update({ id, data });
        if (!updatedMuscle) return res.status(404).json({ message: 'Muscle not found' });

        res.status(200).json(updatedMuscle);
    } catch (err) {
        if (err.message && err.message === 'Muscle with this name already exists') {
            return res.status(409).json({ message: err.message });
        }
        throw err;
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const muscle = await MuscleModel.delete({ id });
    if (!muscle) return res.status(404).json({ message: 'Muscle not found' });
    res.status(200).json(muscle);
});

export default router;
