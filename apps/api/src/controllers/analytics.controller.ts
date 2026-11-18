import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { GradeService } from '../services/grade.service';
import { Role } from '@prisma/client';

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/teacher/overview
   */
  static async getTeacherOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { classId, startDate, endDate } = req.query;

      const data = await AnalyticsService.getTeacherOverview(user.userId, {
        classId: classId as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
      });

      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/teacher/classes/:classId
   */
  static async getTeacherClassAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { classId } = req.params;
      const isAdmin = user.role === Role.ADMIN;

      const data = await AnalyticsService.getTeacherClassAnalytics(classId, user.userId, isAdmin);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/teacher/students/:studentId
   */
  static async getTeacherStudentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { studentId } = req.params;
      const isAdmin = user.role === Role.ADMIN;

      const data = await AnalyticsService.getTeacherStudentAnalytics(studentId, user.userId, isAdmin);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/teacher/assignments/:assignmentId
   */
  static async getTeacherAssignmentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { assignmentId } = req.params;
      const isAdmin = user.role === Role.ADMIN;

      const data = await GradeService.getAssignmentAnalytics(assignmentId, user.userId, isAdmin);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/student/overview
   */
  static async getStudentOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const data = await AnalyticsService.getStudentOverview(user.userId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/student/performance
   */
  static async getStudentPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const data = await GradeService.getStudentAnalytics(user.userId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/admin/overview
   */
  static async getAdminOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      if (user.role !== Role.ADMIN) {
        res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        return;
      }

      const data = await AnalyticsService.getAdminOverview();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
