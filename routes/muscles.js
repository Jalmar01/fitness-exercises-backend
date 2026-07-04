import express from 'express';
import { MuscleController } from '../controllers/muscle.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = express.Router();

// Public routes
router.get('/', MuscleController.getAll);
router.get('/:id', MuscleController.getById);

// Protected routes
router.post('/', authenticate, authorize('admin', 'super_admin'), MuscleController.create);
router.patch('/:id', authenticate, authorize('admin', 'super_admin'), MuscleController.update);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), MuscleController.delete);

export default router;
