import express from 'express';
import { ExerciseController } from '../controllers/exercise.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = express.Router();

// Public routes
router.get('/', ExerciseController.getAll);
router.get('/:id', ExerciseController.getById);
router.get('/:exerciseId/muscles', ExerciseController.getMuscles);

// Protected routes
router.post('/', authenticate, authorize('admin', 'super_admin'), ExerciseController.create);
router.patch('/:id', authenticate, authorize('admin', 'super_admin'), ExerciseController.update);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), ExerciseController.delete);
router.patch('/:id/restore', authenticate, authorize('admin', 'super_admin'), ExerciseController.restore);

router.post('/:exerciseId/muscles', authenticate, authorize('admin', 'super_admin'), ExerciseController.addMuscle);
router.patch('/:exerciseId/muscles/:muscleId', authenticate, authorize('admin', 'super_admin'), ExerciseController.updateMuscleRole);
router.delete('/:exerciseId/muscles/:muscleId', authenticate, authorize('admin', 'super_admin'), ExerciseController.removeMuscle);

export default router;
