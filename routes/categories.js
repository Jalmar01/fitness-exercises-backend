import express from 'express';
import { CategoryController } from '../controllers/category.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = express.Router();

// Public routes
router.get('/', CategoryController.getAll);
router.get('/:id', CategoryController.getById);

// Protected routes
router.post('/', authenticate, authorize('admin', 'super_admin'), CategoryController.create);
router.patch('/:id', authenticate, authorize('admin', 'super_admin'), CategoryController.update);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), CategoryController.delete);

export default router;
