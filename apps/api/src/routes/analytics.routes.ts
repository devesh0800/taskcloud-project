import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateUser);

// Teacher analytics
router.get(
  '/teacher/overview',
  requireRole([Role.TEACHER, Role.ADMIN]),
  AnalyticsController.getTeacherOverview
);
router.get(
  '/teacher/classes/:classId',
  requireRole([Role.TEACHER, Role.ADMIN]),
  AnalyticsController.getTeacherClassAnalytics
);
router.get(
  '/teacher/students/:studentId',
  requireRole([Role.TEACHER, Role.ADMIN]),
  AnalyticsController.getTeacherStudentAnalytics
);
router.get(
  '/teacher/assignments/:assignmentId',
  requireRole([Role.TEACHER, Role.ADMIN]),
  AnalyticsController.getTeacherAssignmentAnalytics
);

// Student analytics
router.get(
  '/student/overview',
  requireRole([Role.STUDENT, Role.ADMIN]),
  AnalyticsController.getStudentOverview
);
router.get(
  '/student/performance',
  requireRole([Role.STUDENT, Role.ADMIN]),
  AnalyticsController.getStudentPerformance
);

// Admin analytics
router.get(
  '/admin/overview',
  requireRole([Role.ADMIN]),
  AnalyticsController.getAdminOverview
);

export default router;
