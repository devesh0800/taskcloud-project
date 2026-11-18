import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AssignmentStatus, SubmissionStatus } from '@prisma/client';

export class StudentController {
  /**
   * GET /api/v1/student/dashboard
   * Aggregates stats, upcoming assignments, recent activity, and academic performance
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;

      // 1. Classes student is enrolled in
      const memberships = await prisma.classMember.findMany({
        where: { studentId },
        include: {
          class: { select: { id: true, name: true, classCode: true, teacher: { select: { fullName: true } } } },
        },
      });
      const enrolledClassIds = memberships.map((m) => m.classId);

      // 2. All published assignments in enrolled classes
      const allClassAssignments = await prisma.assignment.findMany({
        where: {
          classId: { in: enrolledClassIds },
          status: AssignmentStatus.PUBLISHED,
        },
        include: {
          class: { select: { name: true, classCode: true } },
          teacher: { select: { fullName: true } },
        },
        orderBy: { deadline: 'asc' },
      });

      // 3. Submissions made by this student
      const studentSubmissions = await prisma.submission.findMany({
        where: { studentId },
        include: {
          assignment: { select: { id: true, title: true, totalMarks: true } },
          grades: { where: { isPublished: true }, orderBy: { createdAt: 'desc' } },
        },
      });

      const submittedAssignmentIds = new Set(studentSubmissions.map((s) => s.assignmentId));

      // 4. Calculate dashboard metrics
      const totalAssignments = allClassAssignments.length;
      const submittedCount = studentSubmissions.length;
      const pendingCount = allClassAssignments.filter((a) => !submittedAssignmentIds.has(a.id)).length;
      const evaluatedCount = studentSubmissions.filter((s) => s.status === SubmissionStatus.EVALUATED).length;

      // Calculate Average Marks percentage
      const gradedSubmissions = studentSubmissions.filter(
        (s) => s.grades.length > 0 && s.grades[0].marks !== null
      );
      let avgMarks = 0;
      if (gradedSubmissions.length > 0) {
        const totalEarned = gradedSubmissions.reduce((acc, s) => acc + (s.grades[0].marks || 0), 0);
        const totalMax = gradedSubmissions.reduce((acc, s) => acc + (s.assignment.totalMarks || 100), 0);
        avgMarks = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
      }

      // 5. Upcoming Assignments (unsubmitted, sorted by nearest deadline)
      const now = new Date();
      const upcomingAssignments = allClassAssignments
        .filter((a) => !submittedAssignmentIds.has(a.id))
        .slice(0, 5)
        .map((a) => {
          const diffMs = new Date(a.deadline).getTime() - now.getTime();
          const isOverdue = diffMs < 0;
          const daysLeft = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
          const timeRemaining = isOverdue
            ? `Overdue by ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
            : diffMs <= 86400000
            ? 'Due today'
            : `${daysLeft} days remaining`;

          return {
            id: a.id,
            title: a.title,
            className: a.class.name,
            classCode: a.class.classCode,
            teacherName: a.teacher.fullName,
            totalMarks: a.totalMarks,
            deadline: a.deadline,
            timeRemaining,
            isOverdue,
          };
        });

      // 6. Recent Activity (Recent submissions and published grades)
      const recentActivity = studentSubmissions.slice(0, 5).map((s) => {
        const hasGrade = s.grades.length > 0;
        return {
          id: s.id,
          assignmentTitle: s.assignment.title,
          submittedAt: s.submittedAt,
          status: s.status,
          gradeAwarded: hasGrade ? s.grades[0].marks : null,
          letterGrade: hasGrade ? s.grades[0].grade : null,
          feedback: hasGrade ? s.grades[0].feedback : null,
          gradedAt: hasGrade ? s.grades[0].createdAt : null,
        };
      });

      // 7. Academic Performance per Subject
      const performanceByClass = memberships.map((m) => {
        const classAssigns = allClassAssignments.filter((a) => a.classId === m.classId);
        const classSubs = studentSubmissions.filter((s) =>
          classAssigns.some((a) => a.id === s.assignmentId)
        );
        const classGraded = classSubs.filter((s) => s.grades.length > 0);
        const totalMarksPossible = classGraded.reduce((acc, s) => acc + (s.assignment.totalMarks || 100), 0);
        const totalMarksScored = classGraded.reduce((acc, s) => acc + (s.grades[0].marks || 0), 0);
        const percentage = totalMarksPossible > 0 ? Math.round((totalMarksScored / totalMarksPossible) * 100) : 0;

        return {
          className: m.class.name,
          classCode: m.class.classCode,
          assignedCount: classAssigns.length,
          completedCount: classSubs.length,
          scorePercentage: percentage,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          stats: {
            totalAssignments,
            pendingAssignments: pendingCount,
            submittedAssignments: submittedCount,
            evaluatedAssignments: evaluatedCount,
            averageMarks: avgMarks,
          },
          upcomingAssignments,
          recentActivity,
          performance: {
            performanceByClass,
            completionRate: totalAssignments > 0 ? Math.round((submittedCount / totalAssignments) * 100) : 0,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/student/classes
   */
  static async getClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const memberships = await prisma.classMember.findMany({
        where: { studentId },
        include: {
          class: {
            include: {
              teacher: { select: { fullName: true, email: true, department: true } },
              _count: { select: { assignments: true, members: true } },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: memberships.map((m) => ({
          membershipId: m.id,
          classId: m.class.id,
          name: m.class.name,
          description: m.class.description,
          classCode: m.class.classCode,
          teacherName: m.class.teacher.fullName,
          teacherEmail: m.class.teacher.email,
          teacherDepartment: m.class.teacher.department,
          assignmentCount: m.class._count.assignments,
          memberCount: m.class._count.members,
          joinedAt: m.joinedAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/student/assignments
   */
  static async getAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;

      const memberships = await prisma.classMember.findMany({
        where: { studentId },
        select: { classId: true },
      });
      const enrolledClassIds = memberships.map((m) => m.classId);

      const assignments = await prisma.assignment.findMany({
        where: {
          classId: { in: enrolledClassIds },
          status: AssignmentStatus.PUBLISHED,
        },
        include: {
          class: { select: { name: true, classCode: true } },
          teacher: { select: { fullName: true } },
          attachments: true,
          submissions: {
            where: { studentId },
            include: { grades: { take: 1, orderBy: { createdAt: 'desc' } } },
          },
        },
        orderBy: { deadline: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: assignments.map((a) => {
          const submission = a.submissions[0] || null;
          return {
            id: a.id,
            title: a.title,
            description: a.description,
            instructions: a.instructions,
            totalMarks: a.totalMarks,
            deadline: a.deadline,
            className: a.class.name,
            classCode: a.class.classCode,
            teacherName: a.teacher.fullName,
            attachments: a.attachments,
            submission: submission
              ? {
                  id: submission.id,
                  status: submission.status,
                  submittedAt: submission.submittedAt,
                  marksAwarded: submission.grades[0]?.marks ?? null,
                  letterGrade: submission.grades[0]?.grade ?? null,
                  feedback: submission.grades[0]?.feedback ?? null,
                }
              : null,
            isSubmitted: !!submission,
          };
        }),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/student/submissions
   */
  static async getSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const submissions = await prisma.submission.findMany({
        where: { studentId },
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              totalMarks: true,
              deadline: true,
              class: { select: { name: true, classCode: true } },
              teacher: { select: { fullName: true } },
            },
          },
          files: true,
          grades: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { submittedAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: submissions.map((s) => ({
          id: s.id,
          assignment: s.assignment,
          status: s.status,
          answerText: s.answerText,
          submittedAt: s.submittedAt,
          files: s.files,
          latestGrade: s.grades[0] || null,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/student/grades
   */
  static async getGrades(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const submissions = await prisma.submission.findMany({
        where: {
          studentId,
          grades: { some: { isPublished: true } },
        },
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              totalMarks: true,
              class: { select: { name: true, classCode: true } },
            },
          },
          grades: {
            where: { isPublished: true },
            orderBy: { createdAt: 'desc' },
            include: { teacher: { select: { fullName: true } } },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: submissions.map((s) => ({
          submissionId: s.id,
          assignmentTitle: s.assignment.title,
          className: s.assignment.class.name,
          classCode: s.assignment.class.classCode,
          totalMarks: s.assignment.totalMarks,
          marksObtained: s.grades[0]?.marks,
          letterGrade: s.grades[0]?.grade,
          feedback: s.grades[0]?.feedback,
          evaluatedBy: s.grades[0]?.teacher.fullName,
          evaluatedAt: s.grades[0]?.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
}
