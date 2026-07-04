import { ExerciseModel } from '../models/exercise.js';
import { exerciseSchema, validatePartialSchemas, exerciseMuscleSchema, validatePartialExerciseMuscle } from '../schemas/exercise.js';

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

    static async getMuscles (req, res) {
        const { exerciseId } = req.params;
        const muscles = await ExerciseModel.getMuscles({ exerciseId });
        res.status(200).json(muscles);
    }

    static async addMuscle (req, res) {
        const result = exerciseMuscleSchema.safeParse(req.body);
        if (!result.success) return res.status(400).json({ error: JSON.parse(result.error.message) });

        const { exerciseId } = req.params;
        try {
            const association = await ExerciseModel.addMuscle({
                exerciseId,
                muscleId: result.data.muscle_id,
                role: result.data.role,
            });
            res.status(201).json(association);
        } catch (err) {
            if (err.message === 'Exercise not found') {
                return res.status(404).json({ message: err.message });
            }
            if (err.message === 'Muscle not found') {
                return res.status(404).json({ message: err.message });
            }
            if (err.message === 'Already associated') {
                return res.status(409).json({ message: err.message });
            }
            throw err;
        }
    }

    static async updateMuscleRole (req, res) {
        const result = validatePartialExerciseMuscle(req.body);
        if (!result.success) return res.status(400).json({ error: JSON.parse(result.error.message) });

        const { exerciseId, muscleId } = req.params;
        const association = await ExerciseModel.updateMuscleRole({
            exerciseId,
            muscleId,
            role: result.data.role,
        });
        if (!association) return res.status(404).json({ message: 'Association not found' });
        res.status(200).json(association);
    }

    static async removeMuscle (req, res) {
        const { exerciseId, muscleId } = req.params;
        const association = await ExerciseModel.removeMuscle({ exerciseId, muscleId });
        if (!association) return res.status(404).json({ message: 'Association not found' });
        res.status(200).json(association);
    }
}
