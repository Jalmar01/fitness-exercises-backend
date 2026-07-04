import { ExerciseModel } from '../models/exercise.js';
import { exerciseSchema, validatePartialSchemas } from '../schemas/exercise.js';

export class ExerciseController {
    static async getAll (req, res) {
        const exercises = await ExerciseModel.getAll();
        res.status(200).json(exercises);
    }

    static async getById (req, res) {
        const { id } = req.params;
        const exercise = await ExerciseModel.getById({ id });
        if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
        res.json(exercise);
    }

    static async create (req, res) {
        const result = exerciseSchema.safeParse(req.body);
        if (!result.success) return res.status(400).json({ error: JSON.parse(result.error.message) });

        const newExercise = await ExerciseModel.create({ ...result.data });
        res.status(201).json(newExercise);
    }

    static async update (req, res) {
        const { id } = req.params;
        const result = validatePartialSchemas(req.body);
        if (!result.success) return res.status(400).json({ error: JSON.parse(result.error.message) });

        const updateExercise = await ExerciseModel.update({ id, data: result.data });
        if (!updateExercise) return res.status(404).json({ message: 'Exercise not found' });
        res.status(200).json(updateExercise);
    }

    static async delete (req, res) {
        const { id } = req.params;
        const exercise = await ExerciseModel.delete({ id });
        if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
        res.status(200).json(exercise);
    }

    static async restore (req, res) {
        const { id } = req.params;
        const exercise = await ExerciseModel.restore({ id });
        if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
        res.status(200).json(exercise);
    }
}
