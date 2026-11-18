import { Request, Response, NextFunction } from 'express';
import { AssignmentService } from '../services/assignment.service';
import { LocalFileStorageService } from '../storage/localStorage.service';
import { AssignmentStatus, Role } from '@prisma/client';
import fs from 'fs';

export class AssignmentController {
  private static storageService = new LocalFileStorageService();

  /**
   * POST /api/v1/assignments
   * Teacher creates assignment with optional attachments
   */
  static async createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;
      const {
        title,
        description,
        instructions,
        subject,
        totalMarks,
        passingMarks,
        startDate,
        deadline,
        allowLateSubmission,
        allowResubmission,
        maxAttempts,
        status,
        classId,
      } = req.body;

      if (!title || !instructions || !deadline || !classId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Title, instructions, deadline, and classId are required.' },
        });
        return;
      }

      // Handle any uploaded files (Multer memoryStorage)
      const files = req.files as Express.Multer.File[] | undefined;
      const attachmentsData: Array<{
        fileName: string;
        originalName: string;
        mimeType: string;
        fileSize: number;
        storagePath: string;
      }> = [];

      if (files && files.length > 0) {
        for (const file of files) {
          const saved = await AssignmentController.storageService.saveFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            'assignments'
          );
          attachmentsData.push({
            fileName: saved.storedFileName,
            originalName: saved.originalName,
            mimeType: saved.mimeType,
            fileSize: saved.size,
            storagePath: saved.relativeFilePath,
          });
        }
      }

      // Also support JSON body pre-uploaded attachments
      if (req.body.attachments && Array.isArray(req.body.attachments)) {
        attachmentsData.push(...req.body.attachments);
      }

      const assignment = await AssignmentService.createAssignment({
        title,
        description,
        instructions,
        subject,
        totalMarks: totalMarks ? Number(totalMarks) : 100,
        passingMarks: passingMarks ? Number(passingMarks) : undefined,
        startDate: startDate ? new Date(startDate) : new Date(),
        deadline: new Date(deadline),
        allowLateSubmission: allowLateSubmission === 'true' || allowLateSubmission === true,
        allowResubmission: allowResubmission === 'true' || allowResubmission === true,
        maxAttempts: maxAttempts ? Number(maxAttempts) : 1,
        status: status ? (status as AssignmentStatus) : AssignmentStatus.DRAFT,
        teacherId,
        classId,
        attachments: attachmentsData,
      });

      res.status(201).json({
        success: true,
        data: assignment,
        message:
          assignment.status === AssignmentStatus.PUBLISHED
            ? 'Assignment created and published to students!'
            : 'Assignment saved as draft.',
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * GET /api/v1/assignments/teacher
   * Teacher lists assignments
   */
  static async getTeacherAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;
      const classId = req.query.classId as string | undefined;
      const status = req.query.status as AssignmentStatus | undefined;
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await AssignmentService.listByTeacher(teacherId, {
        classId,
        status,
        search,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/assignments/:id
   * Teacher gets single assignment details
   */
  static async getTeacherAssignmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;

      const assignment = await AssignmentService.getTeacherAssignmentDetails(id, teacherId, isAdmin);

      res.status(200).json({
        success: true,
        data: assignment,
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * PATCH /api/v1/assignments/:id
   * Teacher updates assignment details
   */
  static async updateAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;

      const updated = await AssignmentService.updateAssignment(id, teacherId, req.body, isAdmin);

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Assignment updated successfully',
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * DELETE /api/v1/assignments/:id
   * Teacher deletes assignment
   */
  static async deleteAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;

      await AssignmentService.deleteAssignment(id, teacherId, isAdmin);

      res.status(200).json({
        success: true,
        message: 'Assignment deleted successfully',
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * POST /api/v1/assignments/:id/publish
   * Teacher publishes assignment
   */
  static async publishAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;

      const assignment = await AssignmentService.publishAssignment(id, teacherId, isAdmin);

      res.status(200).json({
        success: true,
        data: assignment,
        message: 'Assignment published successfully to all enrolled students!',
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * POST /api/v1/assignments/:id/close
   * Teacher closes assignment
   */
  static async closeAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;

      const assignment = await AssignmentService.closeAssignment(id, teacherId, isAdmin);

      res.status(200).json({
        success: true,
        data: assignment,
        message: 'Assignment closed successfully. No further submissions accepted.',
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * GET /api/v1/assignments/student
   * Student lists assignments from enrolled classes
   */
  static async getStudentAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const classId = req.query.classId as string | undefined;
      const statusFilter = req.query.statusFilter as string | undefined;
      const search = req.query.search as string | undefined;
      const sortBy = (req.query.sortBy as 'deadline' | 'recent') || 'deadline';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await AssignmentService.listByStudent(studentId, {
        classId,
        statusFilter,
        search,
        sortBy,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/assignments/student/:id
   * Student views single assignment details
   */
  static async getStudentAssignmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const studentId = req.user!.userId;

      const assignment = await AssignmentService.getStudentAssignmentDetails(id, studentId);

      res.status(200).json({
        success: true,
        data: assignment,
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * GET /api/v1/assignments/:id/attachments/:attachmentId/download
   * Authenticated file download for reference materials
   */
  static async downloadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, attachmentId } = req.params;
      const user = { userId: req.user!.userId, role: req.user!.role };

      const fileInfo = await AssignmentService.getAttachmentForDownload(id, attachmentId, user);

      if (!fs.existsSync(fileInfo.absolutePath)) {
        res.status(404).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Attachment file not found on disk' },
        });
        return;
      }

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileInfo.originalName)}"`);
      res.setHeader('Content-Type', fileInfo.mimeType);

      const stream = fs.createReadStream(fileInfo.absolutePath);
      stream.pipe(res);
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }
}
