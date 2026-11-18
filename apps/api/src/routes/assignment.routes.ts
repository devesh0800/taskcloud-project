import { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';
import { uploadMultiple } from '../storage/upload.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateUser);

// 1. Student-specific routes
router.get('/student', requireRole([Role.STUDENT, Role.ADMIN]), AssignmentController.getStudentAssignments);
router.get('/student/:id', requireRole([Role.STUDENT, Role.ADMIN]), AssignmentController.getStudentAssignmentById);

// 2. Teacher-specific routes
router.post(
  '/',
  requireRole([Role.TEACHER, Role.ADMIN]),
  uploadMultiple('attachments', 10),
  AssignmentController.createAssignment
);
router.get('/teacher', requireRole([Role.TEACHER, Role.ADMIN]), AssignmentController.getTeacherAssignments);
router.get('/:id', requireRole([Role.TEACHER, Role.ADMIN]), AssignmentController.getTeacherAssignmentById);
router.patch('/:id', requireRole([Role.TEACHER, Role.ADMIN]), AssignmentController.updateAssignment);
router.delete('/:id', requireRole([Role.TEACHER, Role.ADMIN]), AssignmentController.deleteAssignment);
router.post('/:id/publish', requireRole([Role.TEACHER, Role.ADMIN]), AssignmentController.publishAssignment);
router.post('/:id/close', requireRole([Role.TEACHER, Role.ADMIN]), AssignmentController.closeAssignment);

// 3. Shared authenticated download route
router.get('/:id/attachments/:attachmentId/download', AssignmentController.downloadAttachment);

export default router;
