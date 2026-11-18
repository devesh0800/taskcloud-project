import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { Role, SubmissionStatus } from '@prisma/client';

export class AdminController {
  /**
   * GET /api/v1/admin/dashboard
   * System-wide statistics, metrics, and latest activity
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalUsers,
        totalTeachers,
        totalStudents,
        totalClasses,
        totalAssignments,
        totalSubmissions,
        evaluatedSubmissions,
        recentUsers,
        recentActivity,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: Role.TEACHER } }),
        prisma.user.count({ where: { role: Role.STUDENT } }),
        prisma.class.count(),
        prisma.assignment.count(),
        prisma.submission.count(),
        prisma.submission.count({ where: { status: SubmissionStatus.EVALUATED } }),
        prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            department: true,
            course: true,
            isActive: true,
            createdAt: true,
          },
        }),
        prisma.activityLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { fullName: true, email: true, role: true } },
          },
        }),
      ]);

      // Calculate assignment submission completion rate
      const submissionRate =
        totalAssignments > 0
          ? Math.min(100, Math.round((totalSubmissions / (totalAssignments * Math.max(1, totalStudents))) * 100))
          : 0;

      res.status(200).json({
        success: true,
        data: {
          stats: {
            totalUsers,
            totalTeachers,
            totalStudents,
            totalClasses,
            totalAssignments,
            totalSubmissions,
            evaluatedSubmissions,
            submissionRate,
          },
          recentUsers,
          recentActivity: recentActivity.map((log) => ({
            id: log.id,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            userName: log.user?.fullName || 'System',
            userRole: log.user?.role || 'SYSTEM',
            metadata: log.metadata,
            createdAt: log.createdAt,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/users
   * Filterable, searchable, paginated users list
   */
  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const role = req.query.role as Role | undefined;
      const search = (req.query.search as string) || '';

      const where: any = {};
      if (role && Object.values(Role).includes(role)) {
        where.role = role;
      }
      if (search.trim()) {
        where.OR = [
          { fullName: { contains: search.trim(), mode: 'insensitive' } },
          { email: { contains: search.trim(), mode: 'insensitive' } },
          { studentId: { contains: search.trim(), mode: 'insensitive' } },
          { teacherId: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            studentId: true,
            teacherId: true,
            department: true,
            course: true,
            semester: true,
            section: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
            _count: {
              select: {
                taughtClasses: true,
                classMemberships: true,
                submissions: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/users/:id/status
   * Activate or deactivate user account
   */
  static async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'isActive must be a boolean' },
        });
        return;
      }

      // Prevent admin from deactivating themselves
      if (id === req.user?.userId && !isActive) {
        res.status(400).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You cannot deactivate your own admin account' },
        });
        return;
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user?.userId,
          action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          entityType: 'USER',
          entityId: id,
          metadata: { targetUser: updated.email },
        },
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/activity-logs
   */
  static async getActivityLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;

      const [logs, total] = await Promise.all([
        prisma.activityLog.findMany({
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { fullName: true, email: true, role: true } },
          },
        }),
        prisma.activityLog.count(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
