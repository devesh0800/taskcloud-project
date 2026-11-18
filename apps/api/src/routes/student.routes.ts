import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// All student endpoints require authenticated session and STUDENT (or ADMIN) role
router.use(authenticateUser, requireRole([Role.STUDENT, Role.ADMIN]));

router.get('/dashboard', StudentController.getDashboard);
router.get('/classes', StudentController.getClasses);
router.get('/assignments', StudentController.getAssignments);
router.get('/submissions', StudentController.getSubmissions);
router.get('/grades', StudentController.getGrades);

export default router;
