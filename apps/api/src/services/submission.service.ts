import { prisma } from '../config/prisma';
import {
  Submission,
  SubmissionStatus,
  SubmissionFile,
  SubmissionAttempt,
  MembershipStatus,
  Role,
  AssignmentStatus,
} from '@prisma/client';
import { emitToRoom, emitToUser, broadcastNotification } from '../sockets/socket.server';
import { LocalFileStorageService } from '../storage/localStorage.service';
import fs from 'fs';

export interface CreateSubmissionInput {
  assignmentId: string;
  studentId: string;
  answerText?: string;
  files?: Array<{
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    storagePath: string;
  }>;
}

export interface ListTeacherSubmissionsOptions {
  classId?: string;
  assignmentId?: string;
  status?: string;
  search?: string;
  sortBy?: 'recent' | 'studentName' | 'status';
  page?: number;
  limit?: number;
}

export class SubmissionService {
  private static storageService = new LocalFileStorageService();

  /**
   * Student submits an assignment (initial or resubmission)
   */
  static async submitAssignment(data: CreateSubmissionInput): Promise<any> {
    const { assignmentId, studentId, answerText, files } = data;

    // 1. Verify student exists and has STUDENT role
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true, email: true, studentId: true, role: true },
    });
    if (!student || (student.role !== Role.STUDENT && student.role !== Role.ADMIN)) {
      throw { status: 403, message: 'Only students can submit assignments' };
    }

    // 2. Verify assignment exists and is PUBLISHED
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: { select: { id: true, name: true, teacherId: true } },
      },
    });

    if (!assignment) {
      throw { status: 404, message: 'Assignment not found' };
    }

    if (assignment.status === AssignmentStatus.DRAFT) {
      throw { status: 404, message: 'Assignment not found or not published' };
    }

    if (assignment.status === AssignmentStatus.CLOSED) {
      throw { status: 400, message: 'This assignment is closed. No further submissions are accepted.' };
    }

    // 3. Verify student enrollment in the assignment's class
    const membership = await prisma.classMember.findUnique({
      where: {
        classId_studentId: {
          classId: assignment.classId,
          studentId,
        },
      },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw { status: 403, message: 'You are not actively enrolled in the class for this assignment' };
    }

    // 4. Validate deadline and late submission rules
    const now = new Date();
    const isLate = now > new Date(assignment.deadline);

    if (isLate && !assignment.allowLateSubmission) {
      throw {
        status: 400,
        message: 'The deadline for this assignment has passed and late submissions are not allowed.',
      };
    }

    const calculatedStatus: SubmissionStatus = isLate
      ? SubmissionStatus.LATE
      : SubmissionStatus.SUBMITTED;

    // 5. Check if previous submission exists
    const existingSubmission = await prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
      include: {
        attempts: true,
        files: true,
      },
    });

    let attemptNumber = 1;

    if (existingSubmission) {
      // Check if resubmission is allowed
      const isTeacherRequested =
        existingSubmission.status === SubmissionStatus.RESUBMISSION_REQUIRED ||
        existingSubmission.status === SubmissionStatus.RESUBMISSION_REQUESTED;

      if (!assignment.allowResubmission && !isTeacherRequested) {
        throw {
          status: 400,
          message: 'Resubmission is not enabled for this assignment.',
        };
      }

      // Check max attempts
      if (
        assignment.maxAttempts &&
        existingSubmission.attemptNumber >= assignment.maxAttempts &&
        !isTeacherRequested
      ) {
        throw {
          status: 400,
          message: `Maximum submission attempts (${assignment.maxAttempts}) reached.`,
        };
      }

      attemptNumber = existingSubmission.attemptNumber + 1;
    }

    // Must provide either answer text or at least one file
    if ((!answerText || !answerText.trim()) && (!files || files.length === 0)) {
      throw {
        status: 400,
        message: 'Submission must include either text answers or file attachments.',
      };
    }

    // 6. Execute database transaction
    try {
      const result = await prisma.$transaction(async (tx) => {
        let submissionRecord: Submission;

        if (existingSubmission) {
          submissionRecord = await tx.submission.update({
            where: { id: existingSubmission.id },
            data: {
              answerText: answerText?.trim() || null,
              status: calculatedStatus,
              attemptNumber,
              submittedAt: now,
            },
          });
        } else {
          submissionRecord = await tx.submission.create({
            data: {
              assignmentId,
              studentId,
              answerText: answerText?.trim() || null,
              status: calculatedStatus,
              attemptNumber: 1,
              submittedAt: now,
            },
          });
        }

        // Create attempt snapshot record
        const attemptRecord = await tx.submissionAttempt.create({
          data: {
            submissionId: submissionRecord.id,
            attemptNumber,
            answerText: answerText?.trim() || null,
            status: calculatedStatus,
            submittedAt: now,
          },
        });

        // Insert new file records linked to this submission & attempt
        if (files && files.length > 0) {
          await tx.submissionFile.createMany({
            data: files.map((f) => ({
              submissionId: submissionRecord.id,
              attemptId: attemptRecord.id,
              fileName: f.fileName,
              originalName: f.originalName,
              mimeType: f.mimeType,
              fileSize: f.fileSize,
              storagePath: f.storagePath,
            })),
          });
        }

        // Create Notification record for teacher
        const notif = await tx.notification.create({
          data: {
            userId: assignment.teacherId,
            title: attemptNumber > 1 ? 'Assignment Resubmitted' : 'New Assignment Submission',
            message: `${student.fullName} submitted "${assignment.title}" (Attempt #${attemptNumber}).`,
            type: 'SUBMISSION_CREATED',
            entityId: submissionRecord.id,
            link: `/teacher/evaluations/${submissionRecord.id}`,
          },
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            userId: studentId,
            action: attemptNumber > 1 ? 'ASSIGNMENT_RESUBMITTED' : 'ASSIGNMENT_SUBMITTED',
            entityType: 'SUBMISSION',
            entityId: submissionRecord.id,
            metadata: {
              assignmentId,
              attemptNumber,
              status: calculatedStatus,
              fileCount: files?.length || 0,
            },
          },
        });

        return {
          submission: submissionRecord,
          attempt: attemptRecord,
        };
      });

      // 7. Emit real-time Socket.IO events to class room and teacher
      await broadcastNotification({
        id: result.submission.id,
        userId: assignment.teacherId,
        title: attemptNumber > 1 ? 'Assignment Resubmitted' : 'New Assignment Submission',
        message: `${student.fullName} submitted "${assignment.title}" (Attempt #${attemptNumber}).`,
        type: 'SUBMISSION_CREATED',
        entityId: result.submission.id,
        link: `/teacher/evaluations/${result.submission.id}`,
        createdAt: now,
      });

      emitToRoom(`class_${assignment.classId}`, 'submission:created', {
        submissionId: result.submission.id,
        assignmentId,
        studentId,
        studentName: student.fullName,
        attemptNumber,
        status: calculatedStatus,
        submittedAt: now,
      });

      emitToUser(assignment.teacherId, 'submission:new', {
        submissionId: result.submission.id,
        assignmentTitle: assignment.title,
        studentName: student.fullName,
        attemptNumber,
        status: calculatedStatus,
      });

      return this.getSubmissionById(result.submission.id, {
        userId: studentId,
        role: Role.STUDENT,
      });
    } catch (dbError) {
      // 8. On DB error, clean up any written files to prevent orphaned files
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            await this.storageService.deleteFile('submissions', file.fileName);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
      throw dbError;
    }
  }

  /**
   * Get submission by ID with role-based access control
   */
  static async getSubmissionById(
    id: string,
    user: { userId: string; role: Role }
  ): Promise<any> {
    const submission = await prisma.submission.findUnique({
      where: { id },
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
            avatarUrl: true,
          },
        },
        assignment: {
          include: {
            class: {
              select: { id: true, name: true, classCode: true, teacherId: true },
            },
            teacher: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        files: {
          orderBy: { createdAt: 'desc' },
        },
        attempts: {
          orderBy: { attemptNumber: 'desc' },
          include: {
            files: true,
          },
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

    // Role-based authorization
    if (user.role === Role.STUDENT && submission.studentId !== user.userId) {
      throw { status: 403, message: 'You are not authorized to view this submission' };
    }

    if (
      user.role === Role.TEACHER &&
      submission.assignment.teacherId !== user.userId &&
      submission.assignment.class.teacherId !== user.userId
    ) {
      throw { status: 403, message: 'You are not authorized to view submissions for this class' };
    }

    return submission;
  }

  /**
   * Get student's submission for a specific assignment
   */
  static async getStudentAssignmentSubmission(
    assignmentId: string,
    studentId: string
  ): Promise<any> {
    const submission = await prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
      include: {
        files: {
          orderBy: { createdAt: 'desc' },
        },
        attempts: {
          orderBy: { attemptNumber: 'desc' },
          include: { files: true },
        },
        grades: {
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return submission;
  }

  /**
   * Teacher lists submissions across their classes with filters & pagination
   */
  static async listByTeacher(
    teacherId: string,
    options: ListTeacherSubmissionsOptions = {}
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    // Get all class IDs taught by this teacher
    const classes = await prisma.class.findMany({
      where: { teacherId },
      select: { id: true },
    });
    const teacherClassIds = classes.map((c) => c.id);

    if (teacherClassIds.length === 0) {
      return {
        submissions: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        statistics: { total: 0, submitted: 0, late: 0, underReview: 0, evaluated: 0 },
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
          _count: {
            select: { files: true, attempts: true },
          },
          grades: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { marks: true, grade: true, isPublished: true },
          },
        },
      }),
      prisma.submission.count({ where }),
      prisma.submission.groupBy({
        by: ['status'],
        where: {
          assignment: {
            classId: { in: teacherClassIds },
          },
        },
        _count: { status: true },
      }),
    ]);

    // Statistics aggregation
    const statistics = {
      total: allCounts.reduce((acc, curr) => acc + curr._count.status, 0),
      submitted: allCounts.find((c) => c.status === SubmissionStatus.SUBMITTED)?._count.status || 0,
      late: allCounts.find((c) => c.status === SubmissionStatus.LATE)?._count.status || 0,
      underReview: allCounts.find((c) => c.status === SubmissionStatus.UNDER_REVIEW)?._count.status || 0,
      evaluated: allCounts.find((c) => c.status === SubmissionStatus.EVALUATED)?._count.status || 0,
      resubmissionRequired:
        allCounts.find((c) => c.status === SubmissionStatus.RESUBMISSION_REQUIRED)?._count.status || 0,
    };

    return {
      submissions: submissions.map((s) => ({
        id: s.id,
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
        studentAvatar: s.student.avatarUrl,
        answerText: s.answerText,
        status: s.status,
        attemptNumber: s.attemptNumber,
        submittedAt: s.submittedAt,
        fileCount: s._count.files,
        attemptCount: s._count.attempts,
        grade: s.grades[0] || null,
      })),
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
   * Student lists their own submissions
   */
  static async listByStudent(
    studentId: string,
    options: { classId?: string; status?: string; page?: number; limit?: number } = {}
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { studentId };

    if (options.classId) {
      where.assignment = { classId: options.classId };
    }

    if (options.status && options.status !== 'ALL') {
      where.status = options.status as SubmissionStatus;
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
              totalMarks: true,
              deadline: true,
              allowResubmission: true,
              maxAttempts: true,
              class: { select: { id: true, name: true, classCode: true } },
            },
          },
          _count: { select: { files: true, attempts: true } },
          grades: {
            where: { isPublished: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { marks: true, grade: true, feedback: true, isPublished: true },
          },
        },
      }),
      prisma.submission.count({ where }),
    ]);

    return {
      submissions: submissions.map((s) => ({
        id: s.id,
        assignmentId: s.assignmentId,
        assignmentTitle: s.assignment.title,
        totalMarks: s.assignment.totalMarks,
        deadline: s.assignment.deadline,
        className: s.assignment.class.name,
        classCode: s.assignment.class.classCode,
        status: s.status,
        attemptNumber: s.attemptNumber,
        submittedAt: s.submittedAt,
        fileCount: s._count.files,
        attemptCount: s._count.attempts,
        allowResubmission: s.assignment.allowResubmission,
        maxAttempts: s.assignment.maxAttempts,
        grade: s.grades[0] || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get version history (all attempts) for a submission
   */
  static async getSubmissionHistory(
    submissionId: string,
    user: { userId: string; role: Role }
  ): Promise<any> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: { select: { teacherId: true, class: { select: { teacherId: true } } } },
        attempts: {
          orderBy: { attemptNumber: 'asc' },
          include: { files: true },
        },
      },
    });

    if (!submission) {
      throw { status: 404, message: 'Submission not found' };
    }

    if (user.role === Role.STUDENT && submission.studentId !== user.userId) {
      throw { status: 403, message: 'You are not authorized to view this history' };
    }
    if (
      user.role === Role.TEACHER &&
      submission.assignment.teacherId !== user.userId &&
      submission.assignment.class.teacherId !== user.userId
    ) {
      throw { status: 403, message: 'You are not authorized to view this history' };
    }

    return submission.attempts;
  }

  /**
   * Teacher updates submission status (e.g. to UNDER_REVIEW)
   */
  static async updateSubmissionStatus(
    submissionId: string,
    teacherId: string,
    status: SubmissionStatus,
    isAdmin = false
  ): Promise<Submission> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: { select: { teacherId: true, classId: true } } },
    });

    if (!submission) {
      throw { status: 404, message: 'Submission not found' };
    }

    if (submission.assignment.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not teach the class for this submission' };
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: { status },
    });

    emitToUser(submission.studentId, 'submission:status-updated', {
      submissionId,
      status,
    });

    return updated;
  }

  /**
   * Teacher requests student resubmission
   */
  static async requestResubmission(
    submissionId: string,
    teacherId: string,
    note?: string,
    isAdmin = false
  ): Promise<Submission> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: { select: { id: true, title: true, teacherId: true, classId: true } },
      },
    });

    if (!submission) {
      throw { status: 404, message: 'Submission not found' };
    }

    if (submission.assignment.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not teach the class for this submission' };
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.RESUBMISSION_REQUIRED },
    });

    // Create persistent notification for student
    const resubNotif = await prisma.notification.create({
      data: {
        userId: submission.studentId,
        title: 'Resubmission Requested',
        message: `Teacher requested resubmission for "${submission.assignment.title}": ${
          note || 'Please review teacher instructions and submit an updated attempt.'
        }`,
        type: 'RESUBMISSION_REQUIRED',
        entityId: submissionId,
        link: `/student/assignments/${submission.assignment.id}/submit`,
      },
    });

    await broadcastNotification(resubNotif);

    emitToUser(submission.studentId, 'submission:resubmission-required', {
      submissionId,
      assignmentId: submission.assignment.id,
      note,
    });

    return updated;
  }

  /**
   * Authenticated file download validator and resolver
   */
  static async getFileForDownload(
    fileId: string,
    user: { userId: string; role: Role }
  ): Promise<{ absolutePath: string; originalName: string; mimeType: string }> {
    const file = await prisma.submissionFile.findUnique({
      where: { id: fileId },
      include: {
        submission: {
          select: {
            id: true,
            studentId: true,
            assignment: {
              select: { id: true, teacherId: true, class: { select: { teacherId: true } } },
            },
          },
        },
      },
    });

    if (!file) {
      throw { status: 404, message: 'File not found' };
    }

    // Role verification
    if (user.role === Role.STUDENT && file.submission.studentId !== user.userId) {
      throw { status: 403, message: 'You are not authorized to download files from other students' };
    }

    if (
      user.role === Role.TEACHER &&
      file.submission.assignment.teacherId !== user.userId &&
      file.submission.assignment.class.teacherId !== user.userId
    ) {
      throw { status: 403, message: 'You are not authorized to download this file' };
    }

    const absolutePath = await this.storageService.getFilePath('submissions', file.fileName);
    if (!fs.existsSync(absolutePath)) {
      throw { status: 404, message: 'File content missing on storage' };
    }

    return {
      absolutePath,
      originalName: file.originalName,
      mimeType: file.mimeType,
    };
  }

  /**
   * Student removes a file from submission before grading
   */
  static async deleteSubmissionFile(fileId: string, studentId: string): Promise<void> {
    const file = await prisma.submissionFile.findUnique({
      where: { id: fileId },
      include: {
        submission: {
          select: {
            id: true,
            studentId: true,
            status: true,
            grades: { select: { id: true } },
          },
        },
      },
    });

    if (!file) {
      throw { status: 404, message: 'File not found' };
    }

    if (file.submission.studentId !== studentId) {
      throw { status: 403, message: 'You are not authorized to delete this file' };
    }

    if (file.submission.grades.length > 0) {
      throw { status: 400, message: 'Cannot delete files from an evaluated submission' };
    }

    // Delete file from disk
    try {
      await this.storageService.deleteFile('submissions', file.fileName);
    } catch (err) {
      // Continue
    }

    await prisma.submissionFile.delete({
      where: { id: fileId },
    });
  }
}
