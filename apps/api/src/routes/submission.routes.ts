import { Router } from 'express';
import { SubmissionController } from '../controllers/submission.controller';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';
import { uploadMultiple } from '../storage/upload.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateUser);

// 1. Student-specific routes
router.post(
  '/',
  requireRole([Role.STUDENT, Role.ADMIN]),
  uploadMultiple('files', 10),
  SubmissionController.submitAssignment
);
router.get('/student', requireRole([Role.STUDENT, Role.ADMIN]), SubmissionController.getStudentSubmissions);
router.get(
  '/assignment/:assignmentId',
  requireRole([Role.STUDENT, Role.ADMIN]),
  SubmissionController.getStudentAssignmentSubmission
);

// 2. Teacher-specific routes
router.get('/teacher', requireRole([Role.TEACHER, Role.ADMIN]), SubmissionController.getTeacherSubmissions);
router.get('/teacher/:id', requireRole([Role.TEACHER, Role.ADMIN]), SubmissionController.getTeacherSubmissionById);
router.patch('/:id/status', requireRole([Role.TEACHER, Role.ADMIN]), SubmissionController.updateSubmissionStatus);
router.post('/:id/request-resubmission', requireRole([Role.TEACHER, Role.ADMIN]), SubmissionController.requestResubmission);

// 3. File routes
router.get('/files/:fileId/download', SubmissionController.downloadSubmissionFile);
router.delete('/files/:fileId', requireRole([Role.STUDENT, Role.ADMIN]), SubmissionController.deleteSubmissionFile);

// 4. Common details & history (placed after specific paths)
router.get('/:id/history', SubmissionController.getSubmissionHistory);
router.get('/:id', SubmissionController.getSubmissionById);

export default router;
