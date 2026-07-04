import express from 'express';
import { MuscleController } from '../controllers/muscle.controller.js';

const router = express.Router();

router.get('/', MuscleController.getAll);
router.get('/:id', MuscleController.getById);
router.post('/', MuscleController.create);
router.patch('/:id', MuscleController.update);
router.delete('/:id', MuscleController.delete);

export default router;
