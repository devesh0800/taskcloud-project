import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AssignmentStatus, SubmissionStatus } from '@prisma/client';

export class TeacherController {
  /**
   * GET /api/v1/teacher/dashboard
   * Aggregates stats, recent assignments, recent submissions, and analytics
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;

      // 1. Classes taught by this teacher
      const classes = await prisma.class.findMany({
        where: { teacherId },
        select: { id: true, name: true, classCode: true },
      });
      const classIds = classes.map((c) => c.id);

      // 2. Count distinct enrolled students across teacher's classes
      const totalStudentsCount = await prisma.classMember.count({
        where: { classId: { in: classIds } },
      });

      // 3. Total assignments created
      const totalAssignmentsCount = await prisma.assignment.count({
        where: { teacherId },
      });

      // 4. Submissions statistics across teacher's assignments
      const teacherAssignments = await prisma.assignment.findMany({
        where: { teacherId },
        select: { id: true },
      });
      const assignmentIds = teacherAssignments.map((a) => a.id);

      const pendingSubmissionsCount = await prisma.submission.count({
        where: {
          assignmentId: { in: assignmentIds },
          status: { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.LATE, SubmissionStatus.UNDER_REVIEW] },
        },
      });

      const evaluatedSubmissionsCount = await prisma.submission.count({
        where: {
          assignmentId: { in: assignmentIds },
          status: SubmissionStatus.EVALUATED,
        },
      });

      // 5. Recent Assignments (Top 5)
      const recentAssignments = await prisma.assignment.findMany({
        where: { teacherId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          class: { select: { id: true, name: true, classCode: true } },
          _count: { select: { submissions: true } },
        },
      });

      // 6. Recent Submissions (Top 5)
      const recentSubmissions = await prisma.submission.findMany({
        where: { assignmentId: { in: assignmentIds } },
        orderBy: { submittedAt: 'desc' },
        take: 5,
        include: {
          student: { select: { id: true, fullName: true, email: true, studentId: true } },
          assignment: { select: { id: true, title: true, totalMarks: true, class: { select: { name: true } } } },
          grades: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      });

      // 7. Completion Rate Analytics per class
      const classAnalytics = await Promise.all(
        classes.map(async (cls) => {
          const studentCount = await prisma.classMember.count({ where: { classId: cls.id } });
          const assignCount = await prisma.assignment.count({ where: { classId: cls.id } });
          const classAssignmentIds = (
            await prisma.assignment.findMany({ where: { classId: cls.id }, select: { id: true } })
          ).map((a) => a.id);

          const subCount = await prisma.submission.count({
            where: { assignmentId: { in: classAssignmentIds } },
          });

          const totalPossible = studentCount * assignCount;
          const completionRate = totalPossible > 0 ? Math.round((subCount / totalPossible) * 100) : 0;

          return {
            classId: cls.id,
            className: cls.name,
            classCode: cls.classCode,
            studentCount,
            assignmentCount: assignCount,
            submissionCount: subCount,
            completionRate,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          stats: {
            totalStudents: totalStudentsCount,
            totalClasses: classes.length,
            totalAssignments: totalAssignmentsCount,
            pendingSubmissions: pendingSubmissionsCount,
            evaluatedSubmissions: evaluatedSubmissionsCount,
          },
          recentAssignments: recentAssignments.map((a) => ({
            id: a.id,
            title: a.title,
            className: a.class.name,
            classCode: a.class.classCode,
            deadline: a.deadline,
            totalMarks: a.totalMarks,
            submissionCount: a._count.submissions,
            status: a.status,
            createdAt: a.createdAt,
          })),
          recentSubmissions: recentSubmissions.map((s) => ({
            id: s.id,
            studentName: s.student.fullName,
            studentEmail: s.student.email,
            studentId: s.student.studentId,
            assignmentId: s.assignment.id,
            assignmentTitle: s.assignment.title,
            className: s.assignment.class.name,
            totalMarks: s.assignment.totalMarks,
            submittedAt: s.submittedAt,
            status: s.status,
            latestGrade: s.grades[0]?.marks ?? null,
            letterGrade: s.grades[0]?.grade ?? null,
          })),
          analytics: {
            classBreakdown: classAnalytics,
            overallCompletionRate:
              classAnalytics.length > 0
                ? Math.round(
                    classAnalytics.reduce((acc, c) => acc + c.completionRate, 0) /
                      classAnalytics.length
                  )
                : 0,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/teacher/classes
   */
  static async getClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;
      const classes = await prisma.class.findMany({
        where: { teacherId },
        include: {
          _count: { select: { members: true, assignments: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: classes.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          classCode: c.classCode,
          studentCount: c._count.members,
          assignmentCount: c._count.assignments,
          createdAt: c.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/teacher/assignments
   */
  static async getAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;
      const assignments = await prisma.assignment.findMany({
        where: { teacherId },
        include: {
          class: { select: { id: true, name: true, classCode: true } },
          attachments: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: assignments.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          instructions: a.instructions,
          totalMarks: a.totalMarks,
          deadline: a.deadline,
          status: a.status,
          className: a.class.name,
          classCode: a.class.classCode,
          classId: a.class.id,
          submissionCount: a._count.submissions,
          attachments: a.attachments,
          createdAt: a.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/teacher/submissions
   */
  static async getSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;
      const { status, assignmentId } = req.query;

      const teacherAssignments = await prisma.assignment.findMany({
        where: { teacherId },
        select: { id: true },
      });
      const validAssignmentIds = teacherAssignments.map((a) => a.id);

      const submissions = await prisma.submission.findMany({
        where: {
          assignmentId: assignmentId
            ? String(assignmentId)
            : { in: validAssignmentIds },
          status: status ? (status as SubmissionStatus) : undefined,
        },
        include: {
          student: { select: { id: true, fullName: true, email: true, studentId: true, course: true } },
          assignment: { select: { id: true, title: true, totalMarks: true, deadline: true, class: { select: { name: true } } } },
          files: true,
          grades: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { submittedAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: submissions.map((s) => ({
          id: s.id,
          student: s.student,
          assignment: {
            id: s.assignment.id,
            title: s.assignment.title,
            totalMarks: s.assignment.totalMarks,
            deadline: s.assignment.deadline,
            className: s.assignment.class.name,
          },
          status: s.status,
          answerText: s.answerText,
          submittedAt: s.submittedAt,
          files: s.files,
          grades: s.grades,
          isEvaluated: s.status === SubmissionStatus.EVALUATED,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/teacher/students
   */
  static async getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;
      const classes = await prisma.class.findMany({
        where: { teacherId },
        select: { id: true },
      });
      const classIds = classes.map((c) => c.id);

      const enrollments = await prisma.classMember.findMany({
        where: { classId: { in: classIds } },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              studentId: true,
              course: true,
              semester: true,
              section: true,
              createdAt: true,
            },
          },
          class: { select: { id: true, name: true, classCode: true } },
        },
        orderBy: { joinedAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: enrollments.map((e) => ({
          id: e.id,
          student: e.student,
          class: e.class,
          joinedAt: e.joinedAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/teacher/analytics
   */
  static async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;
      const assignments = await prisma.assignment.findMany({
        where: { teacherId },
        include: {
          class: { select: { name: true } },
          submissions: {
            include: {
              grades: { take: 1, orderBy: { createdAt: 'desc' } },
            },
          },
        },
      });

      const assignmentPerformance = assignments.map((a) => {
        const gradedSubs = a.submissions.filter((s) => s.grades.length > 0 && s.grades[0].marks !== null);
        const avgMarks =
          gradedSubs.length > 0
            ? Math.round(gradedSubs.reduce((acc, s) => acc + (s.grades[0].marks || 0), 0) / gradedSubs.length)
            : 0;

        return {
          assignmentId: a.id,
          title: a.title,
          className: a.class.name,
          totalMarks: a.totalMarks,
          submissionsCount: a.submissions.length,
          gradedCount: gradedSubs.length,
          averageMarks: avgMarks,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          assignmentPerformance,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
