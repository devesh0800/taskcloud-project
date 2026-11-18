import { Router } from 'express';
import { GradeController } from '../controllers/grade.controller';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateUser);

// 1. Student grade endpoints
router.get('/student/analytics', requireRole([Role.STUDENT, Role.ADMIN]), GradeController.getStudentAnalytics);
router.get('/student/:submissionId', requireRole([Role.STUDENT, Role.ADMIN]), GradeController.getStudentGradeDetails);
router.get('/student', requireRole([Role.STUDENT, Role.ADMIN]), GradeController.getStudentGrades);

// 2. Teacher evaluation endpoints
router.get('/teacher', requireRole([Role.TEACHER, Role.ADMIN]), GradeController.getTeacherEvaluations);
router.get('/submissions/:submissionId', requireRole([Role.TEACHER, Role.ADMIN]), GradeController.getSubmissionForEvaluation);
router.get('/history/:submissionId', GradeController.getSubmissionGradingHistory);
router.get('/analytics/assignment/:assignmentId', requireRole([Role.TEACHER, Role.ADMIN]), GradeController.getAssignmentAnalytics);

router.post('/', requireRole([Role.TEACHER, Role.ADMIN]), GradeController.recordGrade);
router.patch('/:id', requireRole([Role.TEACHER, Role.ADMIN]), GradeController.updateGrade);
router.post('/:id/publish', requireRole([Role.TEACHER, Role.ADMIN]), GradeController.publishGrade);
router.post('/:id/request-resubmission', requireRole([Role.TEACHER, Role.ADMIN]), GradeController.requestResubmission);

export default router;
