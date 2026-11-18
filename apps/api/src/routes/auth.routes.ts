import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateUser } from '../middleware/auth.middleware';
import {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
} from '../middleware/rateLimiter';

const router = Router();

// Public auth endpoints with rate limiting
router.post('/register', registerRateLimiter, AuthController.register);
router.post('/login', loginRateLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

// Password recovery & email verification
router.post('/forgot-password', passwordResetRateLimiter, AuthController.forgotPassword);
router.post('/reset-password', passwordResetRateLimiter, AuthController.resetPassword);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', passwordResetRateLimiter, AuthController.resendVerification);

// Authenticated user profile
router.get('/me', authenticateUser, AuthController.getMe);

export default router;
