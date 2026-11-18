import { Request, Response, NextFunction } from 'express';
import { SubmissionService } from '../services/submission.service';
import { LocalFileStorageService } from '../storage/localStorage.service';
import { Role, SubmissionStatus } from '@prisma/client';
import fs from 'fs';

export class SubmissionController {
  private static storageService = new LocalFileStorageService();

  /**
   * POST /api/v1/submissions
   * Student submits an assignment with optional text answer and/or multiple files
   */
  static async submitAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    const uploadedFiles: Array<{
      fileName: string;
      originalName: string;
      mimeType: string;
      fileSize: number;
      storagePath: string;
    }> = [];

    try {
      const studentId = req.user!.userId;
      const { assignmentId, answerText } = req.body;

      if (!assignmentId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Assignment ID is required.' },
        });
        return;
      }

      const files = req.files as Express.Multer.File[] | undefined;

      // Save files to local storage
      if (files && files.length > 0) {
        for (const file of files) {
          const saved = await SubmissionController.storageService.saveFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            'submissions'
          );
          uploadedFiles.push({
            fileName: saved.storedFileName,
            originalName: saved.originalName,
            mimeType: saved.mimeType,
            fileSize: saved.size,
            storagePath: saved.relativeFilePath,
          });
        }
      }

      const submission = await SubmissionService.submitAssignment({
        assignmentId,
        studentId,
        answerText,
        files: uploadedFiles,
      });

      res.status(201).json({
        success: true,
        data: submission,
        message: 'Assignment submitted successfully.',
      });
    } catch (error: any) {
      // Clean up files saved in this request if DB or logic threw error
      for (const f of uploadedFiles) {
        try {
          await SubmissionController.storageService.deleteFile('submissions', f.fileName);
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      if (error.status) {
        res.status(error.status).json({
          success: false,
          error: { code: 'SUBMISSION_ERROR', message: error.message },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/submissions/student
   * List submissions for authenticated student
   */
  static async getStudentSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const { classId, status, page, limit } = req.query;

      const result = await SubmissionService.listByStudent(studentId, {
        classId: classId as string | undefined,
        status: status as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result.submissions,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/submissions/assignment/:assignmentId
   * Get student's submission for a particular assignment
   */
  static async getStudentAssignmentSubmission(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const { assignmentId } = req.params;

      const submission = await SubmissionService.getStudentAssignmentSubmission(
        assignmentId,
        studentId
      );

      res.status(200).json({
        success: true,
        data: submission,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/submissions/:id
   * Get submission details by ID
   */
  static async getSubmissionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = { userId: req.user!.userId, role: req.user!.role as Role };

      const submission = await SubmissionService.getSubmissionById(id, user);

      res.status(200).json({
        success: true,
        data: submission,
      });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: error.message },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/submissions/:id/history
   * Get submission attempt history
   */
  static async getSubmissionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = { userId: req.user!.userId, role: req.user!.role as Role };

      const history = await SubmissionService.getSubmissionHistory(id, user);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: error.message },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/submissions/teacher
   * Teacher lists all submissions with filtering, search & pagination
   */
  static async getTeacherSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;
      const { classId, assignmentId, status, search, sortBy, page, limit } = req.query;

      const result = await SubmissionService.listByTeacher(teacherId, {
        classId: classId as string | undefined,
        assignmentId: assignmentId as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
        sortBy: sortBy as any,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result.submissions,
        pagination: result.pagination,
        statistics: result.statistics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/submissions/teacher/:id
   * Teacher views submission details
   */
  static async getTeacherSubmissionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = { userId: req.user!.userId, role: req.user!.role as Role };

      const submission = await SubmissionService.getSubmissionById(id, user);

      res.status(200).json({
        success: true,
        data: submission,
      });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: error.message },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * PATCH /api/v1/submissions/:id/status
   * Teacher updates submission status (e.g. UNDER_REVIEW)
   */
  static async updateSubmissionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;

      if (!status || !Object.values(SubmissionStatus).includes(status)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Valid submission status is required.' },
        });
        return;
      }

      const updated = await SubmissionService.updateSubmissionStatus(
        id,
        teacherId,
        status,
        isAdmin
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: `Submission status updated to ${status}.`,
      });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          success: false,
          error: { code: 'UPDATE_FAILED', message: error.message },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/submissions/:id/request-resubmission
   * Teacher requests a resubmission from the student
   */
  static async requestResubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;

      const updated = await SubmissionService.requestResubmission(
        id,
        teacherId,
        note,
        isAdmin
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Resubmission requested successfully. Student has been notified.',
      });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          success: false,
          error: { code: 'REQUEST_FAILED', message: error.message },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/submissions/files/:fileId/download
   * Authenticated file download with ownership verification
   */
  static async downloadSubmissionFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileId } = req.params;
      const user = { userId: req.user!.userId, role: req.user!.role as Role };

      const fileData = await SubmissionService.getFileForDownload(fileId, user);

      res.setHeader('Content-Type', fileData.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileData.originalName)}"`
      );

      res.download(fileData.absolutePath, fileData.originalName, (err) => {
        if (err && !res.headersSent) {
          res.status(500).json({
            success: false,
            error: { code: 'DOWNLOAD_FAILED', message: 'Failed to download file' },
          });
        }
      });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: error.message },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * DELETE /api/v1/submissions/files/:fileId
   * Student removes a submitted file before evaluation
   */
  static async deleteSubmissionFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileId } = req.params;
      const studentId = req.user!.userId;

      await SubmissionService.deleteSubmissionFile(fileId, studentId);

      res.status(200).json({
        success: true,
        message: 'File removed successfully.',
      });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          success: false,
          error: { code: 'DELETE_FAILED', message: error.message },
        });
        return;
      }
      next(error);
    }
  }
}
