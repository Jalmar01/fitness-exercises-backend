import express from 'express';
import pool from '../config/db.js';
import { exerciseSchema, validatePartialSchemas } from '../schemas/exercise.js';
import { ExerciseModel } from '../models/exercise.js';

const router = express.Router();
   
router.get('/', async (req, res) => {
    const exercises = await ExerciseModel.getAll()
    res.status(200).json(exercises)
});

router.post('/', async (req, res) => {

     const result = exerciseSchema.safeParse(req.body)
     if(!result.success) return res.status(400).json({error: JSON.parse(result.error.message)})
     const newExercise = await ExerciseModel.create({ ...result.data })
        res.status(201).json(newExercise)
    });

router.get('/:id', async (req, res) => {

    const { id } = req.params
    const exercise = await ExerciseModel.getById({ id });
    if(!exercise) return res.status(404).json({message: "Exercise not found"})
        res.json(exercise)
});

router.patch('/:id', async (req, res) => {

    const { id } = req.params
    const result = validatePartialSchemas(req.body);
    if(!result.success) return res.status(400).json({error: JSON.parse(result.error.message)})
    const data = result.data
        const updateExercise = await ExerciseModel.update({ id , data})
    if (!updateExercise) return res.status(404).json({message: "Exercise not found"})
return res.status(200).json(updateExercise)
})

router.delete('/:id', async (req, res) => {
    const { id } = req.params
    const exercise = await ExerciseModel.delete({ id })
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' })
    res.status(200).json(exercise)
})

router.patch('/:id/restore', async (req, res) => {
    const { id } = req.params
    const exercise = await ExerciseModel.restore({ id })
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' })
    res.status(200).json(exercise)
})

export default router;