import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, loginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.post('/refresh', authLimiter, AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);

export default router;
