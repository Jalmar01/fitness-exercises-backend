import { MuscleModel } from '../models/muscle.js';
import { muscleSchema, validatePartialMuscle } from '../schemas/muscle.js';

export class MuscleController {
    static async getAll (req, res) {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const muscles = await MuscleModel.getAll({ page, limit });
        res.status(200).json(muscles);
    }

    static async getById (req, res) {
        const { id } = req.params;
        const muscle = await MuscleModel.getById({ id });
        if (!muscle) return res.status(404).json({ message: 'Muscle not found' });
        res.json(muscle);
    }

    static async create (req, res) {
        const result = muscleSchema.safeParse(req.body);
        if (!result.success) return res.status(400).json({ error: JSON.parse(result.error.message) });

        try {
            const newMuscle = await MuscleModel.create({ ...result.data });
            res.status(201).json(newMuscle);
        } catch (err) {
            if (err.message === 'Muscle with this name already exists') {
                return res.status(409).json({ message: err.message });
            }
            throw err;
        }
    }

    static async update (req, res) {
        const { id } = req.params;
        const result = validatePartialMuscle(req.body);
        if (!result.success) return res.status(400).json({ error: JSON.parse(result.error.message) });

        try {
            const updatedMuscle = await MuscleModel.update({ id, data: result.data });
            if (!updatedMuscle) return res.status(404).json({ message: 'Muscle not found' });
            res.status(200).json(updatedMuscle);
        } catch (err) {
            if (err.message === 'Muscle with this name already exists') {
                return res.status(409).json({ message: err.message });
            }
            throw err;
        }
    }

    static async delete (req, res) {
        const { id } = req.params;
        const muscle = await MuscleModel.delete({ id });
        if (!muscle) return res.status(404).json({ message: 'Muscle not found' });
        res.status(200).json(muscle);
    }
}
