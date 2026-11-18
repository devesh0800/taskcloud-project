import { prisma } from '../config/prisma';
import {
  Assignment,
  AssignmentStatus,
  AssignmentAttachment,
  MembershipStatus,
  Role,
  SubmissionStatus,
} from '@prisma/client';
import { emitToRoom, emitToUser } from '../sockets/socket.server';
import { NotificationService } from './notification.service';
import { LocalFileStorageService } from '../storage/localStorage.service';

export interface CreateAssignmentInput {
  title: string;
  description?: string;
  instructions: string;
  subject?: string;
  totalMarks?: number;
  passingMarks?: number;
  startDate?: Date;
  deadline: Date;
  allowLateSubmission?: boolean;
  allowResubmission?: boolean;
  maxAttempts?: number;
  status?: AssignmentStatus;
  teacherId: string;
  classId: string;
  attachments?: Array<{
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    storagePath: string;
  }>;
}

export interface UpdateAssignmentInput {
  title?: string;
  description?: string;
  instructions?: string;
  subject?: string;
  totalMarks?: number;
  passingMarks?: number;
  startDate?: Date;
  deadline?: Date;
  allowLateSubmission?: boolean;
  allowResubmission?: boolean;
  maxAttempts?: number;
  status?: AssignmentStatus;
}

export class AssignmentService {
  /**
   * Teacher creates assignment (as DRAFT or PUBLISHED).
   */
  static async createAssignment(data: CreateAssignmentInput): Promise<Assignment> {
    const { attachments, teacherId, classId, ...assignmentData } = data;

    // Verify teacher owns the class
    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!targetClass) {
      throw { status: 404, message: 'Class not found' };
    }
    if (targetClass.teacherId !== teacherId) {
      throw { status: 403, message: 'You can only create assignments for classes you teach' };
    }

    const isPublished = assignmentData.status === AssignmentStatus.PUBLISHED;

    const assignment = await prisma.assignment.create({
      data: {
        title: assignmentData.title.trim(),
        description: assignmentData.description?.trim() || null,
        instructions: assignmentData.instructions.trim(),
        subject: assignmentData.subject?.trim() || targetClass.subject || null,
        totalMarks: assignmentData.totalMarks || 100,
        passingMarks: assignmentData.passingMarks || null,
        startDate: assignmentData.startDate || new Date(),
        deadline: new Date(assignmentData.deadline),
        allowLateSubmission: assignmentData.allowLateSubmission ?? true,
        allowResubmission: assignmentData.allowResubmission ?? false,
        maxAttempts: assignmentData.maxAttempts || 1,
        status: assignmentData.status || AssignmentStatus.DRAFT,
        publishedAt: isPublished ? new Date() : null,
        teacherId,
        classId,
        attachments:
          attachments && attachments.length > 0
            ? {
                create: attachments.map((att) => ({
                  fileName: att.fileName,
                  originalName: att.originalName,
                  mimeType: att.mimeType,
                  fileSize: att.fileSize,
                  storagePath: att.storagePath,
                })),
              }
            : undefined,
      },
      include: {
        attachments: true,
        class: { select: { id: true, name: true, classCode: true } },
      },
    });

    // If published immediately, dispatch notifications and real-time events
    if (isPublished) {
      await this.notifyEnrolledStudents(assignment.id, classId, assignment.title, targetClass.name);
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: teacherId,
        action: isPublished ? 'ASSIGNMENT_PUBLISHED' : 'ASSIGNMENT_CREATED_DRAFT',
        entityType: 'ASSIGNMENT',
        entityId: assignment.id,
        metadata: {
          title: assignment.title,
          classId: assignment.classId,
          totalMarks: assignment.totalMarks,
          status: assignment.status,
        },
      },
    });

    return assignment;
  }

  /**
   * Helper: Send notifications and Socket.IO events to enrolled students
   */
  private static async notifyEnrolledStudents(
    assignmentId: string,
    classId: string,
    assignmentTitle: string,
    className: string
  ): Promise<void> {
    // 1. Get active enrolled students
    const members = await prisma.classMember.findMany({
      where: { classId, status: MembershipStatus.ACTIVE },
      select: { studentId: true },
    });

    if (members.length === 0) return;

    // 2. Create persistent notification records and broadcast real-time to each student
    const studentIds = members.map((m) => m.studentId);
    await NotificationService.createBatchNotifications(studentIds, {
      title: 'New Assignment Published',
      message: `"${assignmentTitle}" was published in ${className}.`,
      type: 'ASSIGNMENT_PUBLISHED',
      entityId: assignmentId,
      link: `/student/assignments/${assignmentId}`,
    });

    // 3. Emit real-time Socket.IO events to class room
    emitToRoom(`class_${classId}`, 'assignment:published', {
      assignmentId,
      classId,
      title: assignmentTitle,
      className,
    });
  }

  /**
   * Teacher publishes a draft assignment.
   */
  static async publishAssignment(id: string, teacherId: string, isAdmin = false): Promise<Assignment> {
    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { class: { select: { id: true, name: true, teacherId: true } } },
    });

    if (!existing) {
      throw { status: 404, message: 'Assignment not found' };
    }
    if (existing.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not have permission to publish this assignment' };
    }
    if (existing.status === AssignmentStatus.PUBLISHED) {
      return existing;
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        status: AssignmentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: {
        attachments: true,
        class: { select: { id: true, name: true, classCode: true } },
      },
    });

    await this.notifyEnrolledStudents(
      updated.id,
      existing.classId,
      updated.title,
      existing.class.name
    );

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: teacherId,
        action: 'ASSIGNMENT_PUBLISHED',
        entityType: 'ASSIGNMENT',
        entityId: id,
        metadata: { title: updated.title, classId: updated.classId },
      },
    });

    return updated;
  }

  /**
   * Teacher closes an assignment.
   */
  static async closeAssignment(id: string, teacherId: string, isAdmin = false): Promise<Assignment> {
    const existing = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw { status: 404, message: 'Assignment not found' };
    }
    if (existing.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not have permission to close this assignment' };
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: { status: AssignmentStatus.CLOSED },
    });

    emitToRoom(`class_${existing.classId}`, 'assignment:closed', {
      assignmentId: id,
      classId: existing.classId,
      title: updated.title,
    });

    await prisma.activityLog.create({
      data: {
        userId: teacherId,
        action: 'ASSIGNMENT_CLOSED',
        entityType: 'ASSIGNMENT',
        entityId: id,
        metadata: { title: updated.title },
      },
    });

    return updated;
  }

  /**
   * Teacher updates assignment details.
   */
  static async updateAssignment(
    id: string,
    teacherId: string,
    data: UpdateAssignmentInput,
    isAdmin = false
  ): Promise<Assignment> {
    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { class: { select: { id: true, name: true } } },
    });

    if (!existing) {
      throw { status: 404, message: 'Assignment not found' };
    }
    if (existing.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not have permission to edit this assignment' };
    }

    const wasDraft = existing.status === AssignmentStatus.DRAFT;
    const isNowPublishing = data.status === AssignmentStatus.PUBLISHED && wasDraft;

    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title.trim() : undefined,
        description: data.description !== undefined ? data.description.trim() : undefined,
        instructions: data.instructions !== undefined ? data.instructions.trim() : undefined,
        subject: data.subject !== undefined ? data.subject.trim() : undefined,
        totalMarks: data.totalMarks !== undefined ? Number(data.totalMarks) : undefined,
        passingMarks: data.passingMarks !== undefined ? Number(data.passingMarks) : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        allowLateSubmission: data.allowLateSubmission !== undefined ? data.allowLateSubmission : undefined,
        allowResubmission: data.allowResubmission !== undefined ? data.allowResubmission : undefined,
        maxAttempts: data.maxAttempts !== undefined ? Number(data.maxAttempts) : undefined,
        status: data.status !== undefined ? data.status : undefined,
        publishedAt: isNowPublishing ? new Date() : undefined,
      },
      include: {
        attachments: true,
        class: { select: { id: true, name: true, classCode: true } },
      },
    });

    if (isNowPublishing) {
      await this.notifyEnrolledStudents(updated.id, existing.classId, updated.title, existing.class.name);
    } else {
      emitToRoom(`class_${existing.classId}`, 'assignment:updated', {
        assignmentId: id,
        classId: existing.classId,
        title: updated.title,
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: teacherId,
        action: 'ASSIGNMENT_UPDATED',
        entityType: 'ASSIGNMENT',
        entityId: id,
        metadata: { changes: JSON.parse(JSON.stringify(data)) },
      },
    });

    return updated;
  }

  /**
   * Teacher deletes assignment.
   */
  static async deleteAssignment(id: string, teacherId: string, isAdmin = false): Promise<void> {
    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: {
        _count: { select: { submissions: true } },
        attachments: true,
      },
    });

    if (!existing) {
      throw { status: 404, message: 'Assignment not found' };
    }
    if (existing.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not have permission to delete this assignment' };
    }
    if (existing._count.submissions > 0) {
      throw {
        status: 400,
        message: 'Cannot delete assignment with existing student submissions. Consider closing the assignment instead.',
      };
    }

    // Delete local attachment files from storage
    const storageService = new LocalFileStorageService();
    for (const att of existing.attachments) {
      try {
        await storageService.deleteFile('assignments', att.fileName);
      } catch (err) {
        // Continue even if file already gone
      }
    }

    await prisma.assignment.delete({
      where: { id },
    });

    await prisma.activityLog.create({
      data: {
        userId: teacherId,
        action: 'ASSIGNMENT_DELETED',
        entityType: 'ASSIGNMENT',
        entityId: id,
        metadata: { title: existing.title },
      },
    });
  }

  /**
   * Teacher lists their assignments with search, class filter, status filter, and pagination.
   */
  static async listByTeacher(
    teacherId: string,
    options: {
      classId?: string;
      status?: AssignmentStatus;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const where: any = {
      teacherId,
    };

    if (options.classId) where.classId = options.classId;
    if (options.status) where.status = options.status;
    if (options.search?.trim()) {
      where.OR = [
        { title: { contains: options.search.trim(), mode: 'insensitive' } },
        { subject: { contains: options.search.trim(), mode: 'insensitive' } },
        { description: { contains: options.search.trim(), mode: 'insensitive' } },
      ];
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          class: { select: { id: true, name: true, classCode: true } },
          attachments: { select: { id: true, fileName: true, originalName: true, fileSize: true, mimeType: true } },
          _count: {
            select: {
              submissions: true,
            },
          },
          submissions: {
            select: {
              status: true,
              grades: { select: { id: true } },
            },
          },
        },
      }),
      prisma.assignment.count({ where }),
    ]);

    return {
      assignments: assignments.map((a) => {
        const evaluatedCount = a.submissions.filter((s) => s.grades.length > 0).length;
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          instructions: a.instructions,
          subject: a.subject,
          totalMarks: a.totalMarks,
          passingMarks: a.passingMarks,
          startDate: a.startDate,
          deadline: a.deadline,
          allowLateSubmission: a.allowLateSubmission,
          allowResubmission: a.allowResubmission,
          maxAttempts: a.maxAttempts,
          status: a.status,
          publishedAt: a.publishedAt,
          createdAt: a.createdAt,
          className: a.class.name,
          classCode: a.class.classCode,
          classId: a.class.id,
          attachmentsCount: a.attachments.length,
          attachments: a.attachments,
          submissionCount: a._count.submissions,
          evaluatedCount,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Student lists assignments from their enrolled classes (EXCLUDES DRAFT).
   */
  static async listByStudent(
    studentId: string,
    options: {
      classId?: string;
      statusFilter?: string; // ALL | PENDING | SUBMITTED | EVALUATED | LATE | CLOSED
      search?: string;
      sortBy?: 'deadline' | 'recent';
      page?: number;
      limit?: number;
    } = {}
  ) {
    // 1. Get active enrolled class IDs for this student
    const activeMemberships = await prisma.classMember.findMany({
      where: { studentId, status: MembershipStatus.ACTIVE },
      select: { classId: true },
    });
    const enrolledClassIds = activeMemberships.map((m) => m.classId);

    if (enrolledClassIds.length === 0) {
      return { assignments: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    const where: any = {
      classId: options.classId ? options.classId : { in: enrolledClassIds },
      status: { in: [AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED] }, // Never DRAFT
    };

    if (options.search?.trim()) {
      where.OR = [
        { title: { contains: options.search.trim(), mode: 'insensitive' } },
        { subject: { contains: options.search.trim(), mode: 'insensitive' } },
      ];
    }

    const orderBy =
      options.sortBy === 'recent'
        ? { publishedAt: 'desc' as const }
        : { deadline: 'asc' as const };

    const rawAssignments = await prisma.assignment.findMany({
      where,
      orderBy,
      include: {
        class: { select: { id: true, name: true, classCode: true } },
        teacher: { select: { id: true, fullName: true, department: true } },
        attachments: { select: { id: true, fileName: true, originalName: true, fileSize: true, mimeType: true } },
        submissions: {
          where: { studentId },
          include: {
            grades: { where: { isPublished: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    const now = new Date();

    // Map and calculate submission statuses
    const mapped = rawAssignments.map((a) => {
      const submission = a.submissions[0] || null;
      const isSubmitted = !!submission;
      const hasGrade = !!(submission && submission.grades.length > 0);
      const isOverdue = now > new Date(a.deadline) && !isSubmitted;
      const isClosed = a.status === AssignmentStatus.CLOSED;

      let studentStatus = 'PENDING';
      if (isClosed) studentStatus = 'CLOSED';
      else if (hasGrade) studentStatus = 'EVALUATED';
      else if (isSubmitted) studentStatus = submission.status;
      else if (isOverdue) studentStatus = 'OVERDUE';

      const diffMs = new Date(a.deadline).getTime() - now.getTime();
      const daysLeft = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60));
      const countdown =
        diffMs < 0
          ? `Overdue by ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
          : hoursLeft <= 24
          ? `Due in ${hoursLeft} hours`
          : `${daysLeft} days left`;

      return {
        id: a.id,
        title: a.title,
        description: a.description,
        instructions: a.instructions,
        subject: a.subject,
        totalMarks: a.totalMarks,
        passingMarks: a.passingMarks,
        startDate: a.startDate,
        deadline: a.deadline,
        allowLateSubmission: a.allowLateSubmission,
        allowResubmission: a.allowResubmission,
        maxAttempts: a.maxAttempts,
        status: a.status,
        publishedAt: a.publishedAt,
        className: a.class.name,
        classCode: a.class.classCode,
        classId: a.class.id,
        teacherName: a.teacher.fullName,
        attachments: a.attachments,
        isSubmitted,
        isOverdue,
        countdown,
        studentStatus,
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
      };
    });

    // Apply status filter if provided
    let filtered = mapped;
    if (options.statusFilter && options.statusFilter !== 'ALL') {
      const sf = options.statusFilter.toUpperCase();
      if (sf === 'PENDING') filtered = mapped.filter((a) => !a.isSubmitted && a.status !== 'CLOSED');
      else if (sf === 'SUBMITTED') filtered = mapped.filter((a) => a.isSubmitted);
      else if (sf === 'EVALUATED') filtered = mapped.filter((a) => a.studentStatus === 'EVALUATED');
      else if (sf === 'LATE' || sf === 'OVERDUE')
        filtered = mapped.filter((a) => a.isOverdue || a.studentStatus === 'LATE');
      else if (sf === 'CLOSED') filtered = mapped.filter((a) => a.status === 'CLOSED');
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return {
      assignments: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }

  /**
   * Teacher views full assignment details.
   */
  static async getTeacherAssignmentDetails(id: string, teacherId: string, isAdmin = false) {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true, classCode: true, teacherId: true } },
        teacher: { select: { id: true, fullName: true, email: true, department: true } },
        attachments: true,
        submissions: {
          include: {
            student: { select: { id: true, fullName: true, email: true, studentId: true } },
            grades: { orderBy: { createdAt: 'desc' } },
            files: true,
          },
          orderBy: { submittedAt: 'desc' },
        },
        _count: { select: { submissions: true } },
      },
    });

    if (!assignment) {
      throw { status: 404, message: 'Assignment not found' };
    }
    if (assignment.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not have access to this assignment' };
    }

    return assignment;
  }

  /**
   * Student views single published assignment details.
   */
  static async getStudentAssignmentDetails(id: string, studentId: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true, classCode: true } },
        teacher: { select: { id: true, fullName: true, email: true, department: true } },
        attachments: true,
        submissions: {
          where: { studentId },
          include: {
            files: true,
            grades: { where: { isPublished: true }, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    if (!assignment) {
      throw { status: 404, message: 'Assignment not found' };
    }

    // Must be published or closed (no drafts)
    if (assignment.status === AssignmentStatus.DRAFT) {
      throw { status: 404, message: 'Assignment not found or not published' };
    }

    // Verify student is active member of class
    const membership = await prisma.classMember.findUnique({
      where: {
        classId_studentId: {
          classId: assignment.classId,
          studentId,
        },
      },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw { status: 403, message: 'You are not enrolled in the class for this assignment' };
    }

    const now = new Date();
    const submission = assignment.submissions[0] || null;
    const isSubmitted = !!submission;
    const isOverdue = now > new Date(assignment.deadline) && !isSubmitted;

    return {
      ...assignment,
      isSubmitted,
      isOverdue,
      canSubmit:
        assignment.status === AssignmentStatus.PUBLISHED &&
        (!isOverdue || assignment.allowLateSubmission) &&
        (!isSubmitted || assignment.allowResubmission),
      submission,
    };
  }

  /**
   * Authenticated file download validator and resolver.
   */
  static async getAttachmentForDownload(
    assignmentId: string,
    attachmentId: string,
    user: { userId: string; role: Role }
  ): Promise<{ absolutePath: string; originalName: string; mimeType: string }> {
    const attachment = await prisma.assignmentAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        assignment: { select: { id: true, teacherId: true, classId: true, status: true } },
      },
    });

    if (!attachment || attachment.assignmentId !== assignmentId) {
      throw { status: 404, message: 'Attachment not found' };
    }

    const assignment = attachment.assignment;

    if (user.role === Role.TEACHER) {
      if (assignment.teacherId !== user.userId) {
        throw { status: 403, message: 'You do not have access to this assignment attachment' };
      }
    } else if (user.role === Role.STUDENT) {
      if (assignment.status === AssignmentStatus.DRAFT) {
        throw { status: 403, message: 'Cannot access attachments for unpublished assignments' };
      }

      // Check active enrollment
      const membership = await prisma.classMember.findUnique({
        where: {
          classId_studentId: {
            classId: assignment.classId,
            studentId: user.userId,
          },
        },
      });

      if (!membership || membership.status !== MembershipStatus.ACTIVE) {
        throw { status: 403, message: 'You are not enrolled in the class for this assignment' };
      }
    }

    const storageService = new LocalFileStorageService();
    const absolutePath = await storageService.getFilePath('assignments', attachment.fileName);

    return {
      absolutePath,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
    };
  }
}
