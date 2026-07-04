import express from 'express';
import { ExerciseController } from '../controllers/exercise.controller.js';

const router = express.Router();

router.get('/', ExerciseController.getAll);
router.get('/:id', ExerciseController.getById);
router.post('/', ExerciseController.create);
router.patch('/:id', ExerciseController.update);
router.delete('/:id', ExerciseController.delete);
router.patch('/:id/restore', ExerciseController.restore);

router.get('/:exerciseId/muscles', ExerciseController.getMuscles);
router.post('/:exerciseId/muscles', ExerciseController.addMuscle);
router.patch('/:exerciseId/muscles/:muscleId', ExerciseController.updateMuscleRole);
router.delete('/:exerciseId/muscles/:muscleId', ExerciseController.removeMuscle);

export default router;
