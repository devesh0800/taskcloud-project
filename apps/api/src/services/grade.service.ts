// EduSync Grade & Evaluation Service
import { prisma } from '../config/prisma';
import { Grade, SubmissionStatus, Role } from '@prisma/client';
import { emitToRoom, emitToUser, broadcastNotification } from '../sockets/socket.server';
import { SubmissionService } from './submission.service';

export interface CreateGradeInput {
  submissionId: string;
  teacherId: string;
  marks: number;
  feedback?: string;
  evaluationComments?: string;
  grade?: string;
  isPublished?: boolean;
}

export interface UpdateGradeInput {
  marks?: number;
  feedback?: string;
  evaluationComments?: string;
  grade?: string;
  isPublished?: boolean;
}

export interface ListTeacherEvaluationsOptions {
  classId?: string;
  assignmentId?: string;
  status?: string;
  search?: string;
  sortBy?: 'submissionDate' | 'studentName' | 'status' | 'marks';
  page?: number;
  limit?: number;
}

export class GradeService {
  /**
   * Helper: Calculates letter grade from percentage
   * A+: 90–100%
   * A: 80–89.99%
   * B: 70–79.99%
   * C: 60–69.99%
   * D: 40–59.99%
   * F: Below 40%
   */
  static calculateLetterGrade(marks: number, totalMarks: number): string {
    if (totalMarks <= 0) return 'F';
    const percentage = (marks / totalMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  }

  /**
   * Helper: Calculates percentage
   */
  static calculatePercentage(marks: number, totalMarks: number): number {
    if (totalMarks <= 0) return 0;
    return Number(((marks / totalMarks) * 100).toFixed(2));
  }

  /**
   * Teacher creates evaluation (Draft or Published)
   */
  static async recordGrade(data: CreateGradeInput, isAdmin = false): Promise<Grade> {
    const { submissionId, teacherId, marks, feedback, evaluationComments, isPublished } = data;

    // 1. Fetch submission with assignment and class info
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            class: { select: { id: true, name: true, teacherId: true } },
          },
        },
        student: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!submission) {
      throw { status: 404, message: 'Submission not found' };
    }

    // 2. Verify teacher owns the class
    if (submission.assignment.teacherId !== teacherId && submission.assignment.class.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not have permission to evaluate submissions for this class' };
    }

    // 3. Validate marks
    if (marks < 0) {
      throw { status: 400, message: 'Marks obtained cannot be negative' };
    }
    if (marks > submission.assignment.totalMarks) {
      throw {
        status: 400,
        message: `Marks obtained (${marks}) cannot exceed maximum marks (${submission.assignment.totalMarks})`,
      };
    }

    // 4. Calculate or use override grade
    const letterGrade = data.grade || this.calculateLetterGrade(marks, submission.assignment.totalMarks);
    const shouldPublish = isPublished === true;
    const now = new Date();

    // 5. Create Grade record in Neon PostgreSQL (preserving previous grades for evaluation history)
    const gradeRecord = await prisma.grade.create({
      data: {
        submissionId,
        teacherId,
        marks,
        grade: letterGrade,
        feedback: feedback?.trim() || null,
        evaluationComments: evaluationComments?.trim() || null,
        isPublished: shouldPublish,
        evaluatedAt: now,
      },
    });

      // 6. If published, update submission status to EVALUATED and notify student
      if (shouldPublish) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: SubmissionStatus.EVALUATED },
      });

      // Persistent notification for student
      const gradeNotif = await prisma.notification.create({
        data: {
          userId: submission.studentId,
          title: 'Assignment Graded',
          message: `Your submission for "${submission.assignment.title}" has been evaluated: ${letterGrade} (${marks}/${submission.assignment.totalMarks} marks).`,
          type: 'GRADE_PUBLISHED',
          entityId: submissionId,
          link: `/student/grades/${submissionId}`,
        },
      });

      await broadcastNotification(gradeNotif);

      // Real-time events
      emitToUser(submission.studentId, 'grade:published', {
        submissionId,
        assignmentId: submission.assignmentId,
        assignmentTitle: submission.assignment.title,
        marks,
        totalMarks: submission.assignment.totalMarks,
        grade: letterGrade,
        feedback: gradeRecord.feedback,
      });

      emitToRoom(`class_${submission.assignment.classId}`, 'grade:published', {
        submissionId,
        studentId: submission.studentId,
      });
    } else {
      // If saving draft, ensure status is marked UNDER_REVIEW if not already evaluated
      if (submission.status !== SubmissionStatus.EVALUATED) {
        await prisma.submission.update({
          where: { id: submissionId },
          data: { status: SubmissionStatus.UNDER_REVIEW },
        });
      }
    }

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: teacherId,
        action: shouldPublish ? 'GRADE_PUBLISHED' : 'GRADE_DRAFT_SAVED',
        entityType: 'GRADE',
        entityId: gradeRecord.id,
        metadata: {
          submissionId,
          marks,
          grade: letterGrade,
          isPublished: shouldPublish,
        },
      },
    });

    return gradeRecord;
  }

  /**
   * Teacher updates an existing draft or evaluation record
   */
  static async updateGrade(
    gradeId: string,
    teacherId: string,
    data: UpdateGradeInput,
    isAdmin = false
  ): Promise<Grade> {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        submission: {
          include: {
            assignment: { select: { id: true, title: true, totalMarks: true, classId: true, teacherId: true } },
          },
        },
      },
    });

    if (!grade) {
      throw { status: 404, message: 'Grade record not found' };
    }

    if (grade.teacherId !== teacherId && grade.submission.assignment.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not have permission to modify this grade' };
    }

    const totalMarks = grade.submission.assignment.totalMarks;
    const newMarks = data.marks !== undefined ? data.marks : grade.marks;

    if (newMarks < 0) {
      throw { status: 400, message: 'Marks obtained cannot be negative' };
    }
    if (newMarks > totalMarks) {
      throw {
        status: 400,
        message: `Marks obtained (${newMarks}) cannot exceed maximum marks (${totalMarks})`,
      };
    }

    const calculatedGrade =
      data.grade || (data.marks !== undefined ? this.calculateLetterGrade(newMarks, totalMarks) : grade.grade);

    const now = new Date();
    const wasPublished = grade.isPublished;
    const isNowPublishing = data.isPublished === true && !wasPublished;

    const updated = await prisma.grade.update({
      where: { id: gradeId },
      data: {
        marks: newMarks,
        grade: calculatedGrade,
        feedback: data.feedback !== undefined ? data.feedback?.trim() || null : undefined,
        evaluationComments:
          data.evaluationComments !== undefined ? data.evaluationComments?.trim() || null : undefined,
        isPublished: data.isPublished !== undefined ? data.isPublished : undefined,
        evaluatedAt: data.isPublished ? now : undefined,
      },
    });

    if (isNowPublishing || (updated.isPublished && data.marks !== undefined)) {
      await prisma.submission.update({
        where: { id: grade.submissionId },
        data: { status: SubmissionStatus.EVALUATED },
      });

      if (isNowPublishing) {
        const bulkNotif = await prisma.notification.create({
          data: {
            userId: grade.submission.studentId,
            title: 'Assignment Graded',
            message: `Your submission for "${grade.submission.assignment.title}" has been evaluated: ${calculatedGrade} (${newMarks}/${totalMarks} marks).`,
            type: 'GRADE_PUBLISHED',
            entityId: grade.submissionId,
            link: `/student/grades/${grade.submissionId}`,
          },
        });

        await broadcastNotification(bulkNotif);

        emitToUser(grade.submission.studentId, 'grade:published', {
          submissionId: grade.submissionId,
          assignmentTitle: grade.submission.assignment.title,
          marks: newMarks,
          totalMarks,
          grade: calculatedGrade,
        });
      }
    }

    return updated;
  }

  /**
   * Publish a draft grade record
   */
  static async publishGrade(gradeId: string, teacherId: string, isAdmin = false): Promise<Grade> {
    return this.updateGrade(gradeId, teacherId, { isPublished: true }, isAdmin);
  }

  /**
   * Request resubmission for a submission
   */
  static async requestResubmission(
    submissionId: string,
    teacherId: string,
    note?: string,
    isAdmin = false
  ) {
    return SubmissionService.requestResubmission(submissionId, teacherId, note, isAdmin);
  }

  /**
   * Get submission evaluation details for Teacher (includes draft grades & all attempts)
   */
  static async getSubmissionForEvaluation(
    submissionId: string,
    teacherId: string,
    isAdmin = false
  ): Promise<any> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            studentId: true,
            department: true,
            semester: true,
            section: true,
          },
        },
        assignment: {
          include: {
            class: { select: { id: true, name: true, classCode: true, teacherId: true } },
            teacher: { select: { id: true, fullName: true, email: true } },
          },
        },
        files: { orderBy: { createdAt: 'desc' } },
        attempts: {
          orderBy: { attemptNumber: 'desc' },
          include: { files: true },
        },
        grades: {
          orderBy: { createdAt: 'desc' },
          include: {
            teacher: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!submission) {
      throw { status: 404, message: 'Submission not found' };
    }

    if (submission.assignment.teacherId !== teacherId && submission.assignment.class.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not teach the class for this submission' };
    }

    // Latest grade record (can be draft or published)
    const latestGrade = submission.grades[0] || null;

    return {
      submission,
      latestGrade,
      gradingHistory: submission.grades,
      maxMarks: submission.assignment.totalMarks,
    };
  }

  /**
   * Teacher lists all submissions needing evaluation with filters & stats
   */
  static async listTeacherEvaluations(
    teacherId: string,
    options: ListTeacherEvaluationsOptions = {}
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const classes = await prisma.class.findMany({
      where: { teacherId },
      select: { id: true },
    });
    const teacherClassIds = classes.map((c) => c.id);

    if (teacherClassIds.length === 0) {
      return {
        evaluations: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        statistics: { total: 0, pending: 0, underReview: 0, evaluated: 0, resubmissionRequested: 0 },
      };
    }

    const where: any = {
      assignment: {
        classId: options.classId ? options.classId : { in: teacherClassIds },
      },
    };

    if (options.assignmentId) {
      where.assignmentId = options.assignmentId;
    }

    if (options.status && options.status !== 'ALL') {
      where.status = options.status as SubmissionStatus;
    }

    if (options.search?.trim()) {
      const q = options.search.trim();
      where.student = {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { studentId: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    let orderBy: any = { submittedAt: 'desc' };
    if (options.sortBy === 'studentName') {
      orderBy = { student: { fullName: 'asc' } };
    } else if (options.sortBy === 'status') {
      orderBy = { status: 'asc' };
    }

    const [submissions, total, allCounts] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              studentId: true,
              avatarUrl: true,
            },
          },
          assignment: {
            select: {
              id: true,
              title: true,
              totalMarks: true,
              deadline: true,
              class: { select: { id: true, name: true, classCode: true } },
            },
          },
          _count: { select: { files: true, attempts: true } },
          grades: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.submission.count({ where }),
      prisma.submission.groupBy({
        by: ['status'],
        where: {
          assignment: { classId: { in: teacherClassIds } },
        },
        _count: { status: true },
      }),
    ]);

    const statistics = {
      total: allCounts.reduce((acc, curr) => acc + curr._count.status, 0),
      pending:
        (allCounts.find((c) => c.status === SubmissionStatus.SUBMITTED)?._count.status || 0) +
        (allCounts.find((c) => c.status === SubmissionStatus.LATE)?._count.status || 0),
      underReview: allCounts.find((c) => c.status === SubmissionStatus.UNDER_REVIEW)?._count.status || 0,
      evaluated: allCounts.find((c) => c.status === SubmissionStatus.EVALUATED)?._count.status || 0,
      resubmissionRequested:
        allCounts.find((c) => c.status === SubmissionStatus.RESUBMISSION_REQUIRED)?._count.status || 0,
    };

    return {
      evaluations: submissions.map((s) => {
        const grade = s.grades[0] || null;
        return {
          submissionId: s.id,
          assignmentId: s.assignmentId,
          assignmentTitle: s.assignment.title,
          totalMarks: s.assignment.totalMarks,
          deadline: s.assignment.deadline,
          classId: s.assignment.class.id,
          className: s.assignment.class.name,
          classCode: s.assignment.class.classCode,
          studentId: s.student.id,
          studentName: s.student.fullName,
          studentEmail: s.student.email,
          studentRollNo: s.student.studentId,
          submissionDate: s.submittedAt,
          submissionStatus: s.status,
          attemptNumber: s.attemptNumber,
          fileCount: s._count.files,
          isEvaluated: s.status === SubmissionStatus.EVALUATED && grade?.isPublished === true,
          hasDraft: !!grade && !grade.isPublished,
          grade: grade?.grade || null,
          marks: grade?.marks ?? null,
          percentage: grade ? this.calculatePercentage(grade.marks, s.assignment.totalMarks) : null,
          isPublished: grade?.isPublished ?? false,
          gradeId: grade?.id || null,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics,
    };
  }

  /**
   * Get full evaluation history for a submission
   */
  static async getSubmissionGradingHistory(submissionId: string, user: { userId: string; role: Role }) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: { select: { teacherId: true, class: { select: { teacherId: true } } } },
      },
    });

    if (!submission) {
      throw { status: 404, message: 'Submission not found' };
    }

    if (user.role === Role.STUDENT && submission.studentId !== user.userId) {
      throw { status: 403, message: 'Unauthorized' };
    }

    const where: any = { submissionId };
    // Students can ONLY see published grades
    if (user.role === Role.STUDENT) {
      where.isPublished = true;
    }

    return prisma.grade.findMany({
      where,
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Student lists their published grades & feedback
   */
  static async listStudentGrades(
    studentId: string,
    options: { classId?: string; page?: number; limit?: number } = {}
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      studentId,
      status: SubmissionStatus.EVALUATED,
      grades: { some: { isPublished: true } },
    };

    if (options.classId) {
      where.assignment = { classId: options.classId };
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              subject: true,
              totalMarks: true,
              deadline: true,
              class: { select: { id: true, name: true, classCode: true } },
              teacher: { select: { id: true, fullName: true } },
            },
          },
          grades: {
            where: { isPublished: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.submission.count({ where }),
    ]);

    const formatted = submissions.map((s) => {
      const g = s.grades[0];
      const percentage = g ? this.calculatePercentage(g.marks, s.assignment.totalMarks) : 0;
      return {
        submissionId: s.id,
        assignmentId: s.assignmentId,
        assignmentTitle: s.assignment.title,
        subject: s.assignment.subject,
        className: s.assignment.class.name,
        teacherName: s.assignment.teacher.fullName,
        submittedAt: s.submittedAt,
        attemptNumber: s.attemptNumber,
        maxMarks: s.assignment.totalMarks,
        marksObtained: g ? g.marks : 0,
        percentage,
        grade: g ? g.grade : 'F',
        feedback: g?.feedback || null,
        evaluatedAt: g?.evaluatedAt || g?.createdAt,
      };
    });

    return {
      grades: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Student views single published grade details
   */
  static async getStudentGradeDetails(submissionId: string, studentId: string) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            class: { select: { id: true, name: true, classCode: true } },
            teacher: { select: { id: true, fullName: true, email: true } },
          },
        },
        files: true,
        grades: {
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!submission) {
      throw { status: 404, message: 'Submission not found' };
    }

    if (submission.studentId !== studentId) {
      throw { status: 403, message: 'You are not authorized to view this grade' };
    }

    const publishedGrade = submission.grades[0] || null;
    if (!publishedGrade) {
      throw { status: 404, message: 'This submission has not been evaluated or results are pending publication.' };
    }

    const percentage = this.calculatePercentage(publishedGrade.marks, submission.assignment.totalMarks);

    return {
      submissionId: submission.id,
      assignmentId: submission.assignmentId,
      assignmentTitle: submission.assignment.title,
      instructions: submission.assignment.instructions,
      subject: submission.assignment.subject,
      className: submission.assignment.class.name,
      teacherName: submission.assignment.teacher.fullName,
      submittedAt: submission.submittedAt,
      answerText: submission.answerText,
      files: submission.files,
      attemptNumber: submission.attemptNumber,
      maxMarks: submission.assignment.totalMarks,
      marksObtained: publishedGrade.marks,
      percentage,
      grade: publishedGrade.grade,
      feedback: publishedGrade.feedback,
      evaluatedAt: publishedGrade.evaluatedAt || publishedGrade.createdAt,
    };
  }

  /**
   * Student Analytics: Performance summary, marks over time, grade distribution, class-wise stats
   */
  static async getStudentAnalytics(studentId: string) {
    // Only published evaluations
    const submissions = await prisma.submission.findMany({
      where: {
        studentId,
        status: SubmissionStatus.EVALUATED,
        grades: { some: { isPublished: true } },
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
            class: { select: { id: true, name: true } },
          },
        },
        grades: {
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    const evaluatedCount = submissions.length;
    if (evaluatedCount === 0) {
      return {
        summary: {
          totalEvaluated: 0,
          averageMarks: 0,
          highestMarks: 0,
          lowestMarks: 0,
          overallPercentage: 0,
        },
        marksOverTime: [],
        gradeDistribution: [
          { grade: 'A+', count: 0 },
          { grade: 'A', count: 0 },
          { grade: 'B', count: 0 },
          { grade: 'C', count: 0 },
          { grade: 'D', count: 0 },
          { grade: 'F', count: 0 },
        ],
        classPerformance: [],
      };
    }

    let totalMarksEarned = 0;
    let totalMaxMarks = 0;
    let highest = -Infinity;
    let lowest = Infinity;

    const distribution: Record<string, number> = {
      'A+': 0,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };

    const marksOverTime = submissions.map((s) => {
      const g = s.grades[0];
      const max = s.assignment.totalMarks || 100;
      const marks = g ? g.marks : 0;
      const pct = this.calculatePercentage(marks, max);

      totalMarksEarned += marks;
      totalMaxMarks += max;
      if (pct > highest) highest = pct;
      if (pct < lowest) lowest = pct;

      const letter = g?.grade || this.calculateLetterGrade(marks, max);
      if (distribution[letter] !== undefined) {
        distribution[letter]++;
      } else {
        distribution['F']++;
      }

      return {
        date: new Date(s.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        assignment: s.assignment.title,
        percentage: pct,
        marks,
        maxMarks: max,
      };
    });

    const overallPercentage = totalMaxMarks > 0 ? Number(((totalMarksEarned / totalMaxMarks) * 100).toFixed(1)) : 0;
    const averageMarks = Number((totalMarksEarned / evaluatedCount).toFixed(1));

    // Class-wise breakdown
    const classMap: Record<string, { className: string; totalMarks: number; maxMarks: number; count: number }> = {};
    submissions.forEach((s) => {
      const clsId = s.assignment.class.id;
      const clsName = s.assignment.class.name;
      const g = s.grades[0];
      if (!classMap[clsId]) {
        classMap[clsId] = { className: clsName, totalMarks: 0, maxMarks: 0, count: 0 };
      }
      classMap[clsId].count++;
      classMap[clsId].totalMarks += g ? g.marks : 0;
      classMap[clsId].maxMarks += s.assignment.totalMarks || 100;
    });

    const classPerformance = Object.values(classMap).map((c) => ({
      className: c.className,
      averagePercentage: c.maxMarks > 0 ? Number(((c.totalMarks / c.maxMarks) * 100).toFixed(1)) : 0,
      evaluatedCount: c.count,
    }));

    return {
      summary: {
        totalEvaluated: evaluatedCount,
        averageMarks,
        highestMarks: highest === -Infinity ? 0 : highest,
        lowestMarks: lowest === Infinity ? 0 : lowest,
        overallPercentage,
      },
      marksOverTime,
      gradeDistribution: Object.entries(distribution).map(([grade, count]) => ({ grade, count })),
      classPerformance,
    };
  }

  /**
   * Teacher Assignment Analytics:
   * Total students, submissions, pending evaluations, avg marks, highest, lowest, grade distribution
   */
  static async getAssignmentAnalytics(assignmentId: string, teacherId: string, isAdmin = false) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: {
          include: {
            members: { where: { status: 'ACTIVE' } },
          },
        },
        submissions: {
          include: {
            grades: {
              where: { isPublished: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!assignment) {
      throw { status: 404, message: 'Assignment not found' };
    }

    if (assignment.teacherId !== teacherId && assignment.class.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'Unauthorized' };
    }

    const totalStudents = assignment.class.members.length;
    const totalSubmissions = assignment.submissions.length;

    const evaluatedSubmissions = assignment.submissions.filter(
      (s) => s.grades.length > 0 && s.grades[0].isPublished
    );
    const evaluatedCount = evaluatedSubmissions.length;
    const pendingEvaluations = totalSubmissions - evaluatedCount;

    let totalMarksEarned = 0;
    let highest = -Infinity;
    let lowest = Infinity;

    const distribution: Record<string, number> = {
      'A+': 0,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };

    evaluatedSubmissions.forEach((s) => {
      const marks = s.grades[0].marks;
      totalMarksEarned += marks;
      if (marks > highest) highest = marks;
      if (marks < lowest) lowest = marks;

      const letter = s.grades[0].grade || this.calculateLetterGrade(marks, assignment.totalMarks);
      if (distribution[letter] !== undefined) {
        distribution[letter]++;
      } else {
        distribution['F']++;
      }
    });

    const averageMarks = evaluatedCount > 0 ? Number((totalMarksEarned / evaluatedCount).toFixed(1)) : 0;
    const averagePercentage =
      assignment.totalMarks > 0 ? Number(((averageMarks / assignment.totalMarks) * 100).toFixed(1)) : 0;

    return {
      assignmentId,
      title: assignment.title,
      totalMarks: assignment.totalMarks,
      totalStudents,
      totalSubmissions,
      pendingEvaluations,
      evaluatedCount,
      averageMarks,
      averagePercentage,
      highestMarks: highest === -Infinity ? 0 : highest,
      lowestMarks: lowest === Infinity ? 0 : lowest,
      gradeDistribution: Object.entries(distribution).map(([grade, count]) => ({ grade, count })),
    };
  }
}
