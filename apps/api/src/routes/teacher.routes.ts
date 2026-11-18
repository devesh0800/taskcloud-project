import { Router } from 'express';
import { TeacherController } from '../controllers/teacher.controller';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// All teacher endpoints require authenticated session and TEACHER role
router.use(authenticateUser, requireRole([Role.TEACHER, Role.ADMIN]));

router.get('/dashboard', TeacherController.getDashboard);
router.get('/classes', TeacherController.getClasses);
router.get('/assignments', TeacherController.getAssignments);
router.get('/submissions', TeacherController.getSubmissions);
router.get('/students', TeacherController.getStudents);
router.get('/analytics', TeacherController.getAnalytics);

export default router;
