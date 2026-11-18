import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// All admin endpoints require authenticated session and ADMIN role
router.use(authenticateUser, requireRole([Role.ADMIN]));

router.get('/dashboard', AdminController.getDashboard);
router.get('/users', AdminController.getUsers);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.get('/activity-logs', AdminController.getActivityLogs);

export default router;
