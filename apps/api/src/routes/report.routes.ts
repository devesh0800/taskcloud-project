import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateUser);

router.get(
  '/class/:classId',
  requireRole([Role.TEACHER, Role.ADMIN]),
  ReportController.getClassReport
);

router.get(
  '/student/:studentId',
  ReportController.getStudentReport
);

router.get(
  '/assignment/:assignmentId',
  requireRole([Role.TEACHER, Role.ADMIN]),
  ReportController.getAssignmentReport
);

export default router;
