import { Router } from 'express';
import { ClassController } from '../controllers/class.controller';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// All class endpoints require authenticated user session
router.use(authenticateUser);

// 1. Student-specific routes
router.post('/join', requireRole([Role.STUDENT, Role.ADMIN]), ClassController.joinClass);
router.get('/student', requireRole([Role.STUDENT, Role.ADMIN]), ClassController.getStudentClasses);

// 2. Teacher-specific routes
router.post('/', requireRole([Role.TEACHER, Role.ADMIN]), ClassController.createClass);
router.get('/teacher', requireRole([Role.TEACHER, Role.ADMIN]), ClassController.getTeacherClasses);
router.patch('/:id', requireRole([Role.TEACHER, Role.ADMIN]), ClassController.updateClass);
router.post('/:id/regenerate-code', requireRole([Role.TEACHER, Role.ADMIN]), ClassController.regenerateCode);
router.get('/:id/students', requireRole([Role.TEACHER, Role.ADMIN]), ClassController.getStudents);
router.delete('/:id/students/:studentId', requireRole([Role.TEACHER, Role.ADMIN]), ClassController.removeStudent);

// 3. Shared route (Role-aware class details)
router.get('/:id', ClassController.getClassById);

export default router;
