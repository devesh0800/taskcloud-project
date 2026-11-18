import { Request, Response, NextFunction } from 'express';
import { GradeService } from '../services/grade.service';
import { SubmissionService } from '../services/submission.service';
import { Role } from '@prisma/client';

export class GradeController {
  /**
   * POST /api/v1/grades
   * Teacher creates evaluation (Draft or Published)
   */
  static async recordGrade(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;
      const { submissionId, marks, feedback, evaluationComments, grade, isPublished } = req.body;

      if (!submissionId || marks === undefined || marks === null) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'submissionId and marks are required.' },
        });
        return;
      }

      const numericMarks = Number(marks);
      if (isNaN(numericMarks) || numericMarks < 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_MARKS', message: 'Marks obtained must be a positive number.' },
        });
        return;
      }

      const gradeRecord = await GradeService.recordGrade(
        {
          submissionId,
          teacherId,
          marks: numericMarks,
          feedback,
          evaluationComments,
          grade,
          isPublished: isPublished === true || isPublished === 'true',
        },
        isAdmin
      );

      res.status(201).json({
        success: true,
        data: gradeRecord,
        message: isPublished ? 'Evaluation published successfully.' : 'Evaluation draft saved.',
      });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          success: false,
          error: { code: 'EVALUATION_ERROR', message: error.message },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * PATCH /api/v1/grades/:id
   * Teacher updates existing grade record
   */
  static async updateGrade(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;
      const { marks, feedback, evaluationComments, grade, isPublished } = req.body;

      const numericMarks = marks !== undefined && marks !== null ? Number(marks) : undefined;
      if (numericMarks !== undefined && (isNaN(numericMarks) || numericMarks < 0)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_MARKS', message: 'Marks obtained must be a positive number.' },
        });
        return;
      }

      const updated = await GradeService.updateGrade(
        id,
        teacherId,
        {
          marks: numericMarks,
          feedback,
          evaluationComments,
          grade,
          isPublished: isPublished !== undefined ? isPublished === true || isPublished === 'true' : undefined,
        },
        isAdmin
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Evaluation updated successfully.',
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
   * POST /api/v1/grades/:id/publish
   * Teacher publishes draft evaluation
   */
  static async publishGrade(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;

      const updated = await GradeService.publishGrade(id, teacherId, isAdmin);

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Grades published successfully. Student has been notified.',
      });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          success: false,
          error: { code: 'PUBLISH_FAILED', message: error.message },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/grades/:id/request-resubmission
   * Teacher requests resubmission from the evaluation view
   */
  static async requestResubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;

      // Note: id here can be submissionId or gradeId
      const submission = await SubmissionService.requestResubmission(id, teacherId, note, isAdmin);

      res.status(200).json({
        success: true,
        data: submission,
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
   * GET /api/v1/grades/teacher
   * Teacher evaluation dashboard list
   */
  static async getTeacherEvaluations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;
      const { classId, assignmentId, status, search, sortBy, page, limit } = req.query;

      const result = await GradeService.listTeacherEvaluations(teacherId, {
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
        data: result.evaluations,
        pagination: result.pagination,
        statistics: result.statistics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/grades/submissions/:submissionId
   * Teacher review page data (submission, files, current grade draft/published, history)
   */
  static async getSubmissionForEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { submissionId } = req.params;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;

      const result = await GradeService.getSubmissionForEvaluation(submissionId, teacherId, isAdmin);

      res.status(200).json({
        success: true,
        data: result,
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
   * GET /api/v1/grades/history/:submissionId
   * Full grading history for a submission
   */
  static async getSubmissionGradingHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { submissionId } = req.params;
      const user = { userId: req.user!.userId, role: req.user!.role as Role };

      const history = await GradeService.getSubmissionGradingHistory(submissionId, user);

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
   * GET /api/v1/grades/analytics/assignment/:assignmentId
   * Teacher assignment-level evaluation analytics
   */
  static async getAssignmentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assignmentId } = req.params;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;

      const analytics = await GradeService.getAssignmentAnalytics(assignmentId, teacherId, isAdmin);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          success: false,
          error: { code: 'ANALYTICS_FAILED', message: error.message },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/grades/student
   * Student lists their published grades
   */
  static async getStudentGrades(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const { classId, page, limit } = req.query;

      const result = await GradeService.listStudentGrades(studentId, {
        classId: classId as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result.grades,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/grades/student/:submissionId
   * Student views single published grade detail
   */
  static async getStudentGradeDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const { submissionId } = req.params;

      const gradeDetails = await GradeService.getStudentGradeDetails(submissionId, studentId);

      res.status(200).json({
        success: true,
        data: gradeDetails,
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
   * GET /api/v1/grades/student/analytics
   * Student performance analytics overview
   */
  static async getStudentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const analytics = await GradeService.getStudentAnalytics(studentId);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
}
