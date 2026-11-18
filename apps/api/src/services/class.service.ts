import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { Class, ClassMember, MembershipStatus, Role } from '@prisma/client';
import { emitToRoom, emitToUser } from '../sockets/socket.server';
import { NotificationService } from './notification.service';

export interface CreateClassInput {
  name: string;
  description?: string;
  subject?: string;
  department?: string;
  semester?: string;
  section?: string;
  academicYear?: string;
  teacherId: string;
}

export interface UpdateClassInput {
  name?: string;
  description?: string;
  subject?: string;
  department?: string;
  semester?: string;
  section?: string;
  academicYear?: string;
  isArchived?: boolean;
}

export class ClassService {
  /**
   * Generates a cryptographically secure, unique joining code.
   * Format: EDU-XXXXXX (e.g. EDU-7X9K2P)
   * Excludes easily confused characters (0, O, 1, I).
   */
  static generateClassCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const bytes = crypto.randomBytes(6);
    let code = 'EDU-';
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  /**
   * Generates a guaranteed unique class code by checking PostgreSQL.
   */
  static async generateUniqueCode(): Promise<string> {
    let code = this.generateClassCode();
    let exists = await prisma.class.findUnique({ where: { classCode: code } });
    let attempts = 0;
    while (exists && attempts < 10) {
      code = this.generateClassCode();
      exists = await prisma.class.findUnique({ where: { classCode: code } });
      attempts++;
    }
    return code;
  }

  /**
   * Creates a new class associated with the authenticated teacher.
   */
  static async createClass(data: CreateClassInput): Promise<Class> {
    const classCode = await this.generateUniqueCode();

    const newClass = await prisma.class.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        subject: data.subject?.trim() || null,
        department: data.department?.trim() || null,
        semester: data.semester?.trim() || null,
        section: data.section?.trim() || null,
        academicYear: data.academicYear?.trim() || null,
        classCode,
        teacherId: data.teacherId,
        isArchived: false,
      },
      include: {
        teacher: { select: { id: true, fullName: true, email: true, department: true } },
      },
    });

    // Record activity log
    await prisma.activityLog.create({
      data: {
        userId: data.teacherId,
        action: 'CLASS_CREATED',
        entityType: 'CLASS',
        entityId: newClass.id,
        metadata: {
          className: newClass.name,
          classCode: newClass.classCode,
          subject: newClass.subject,
        },
      },
    });

    return newClass;
  }

  /**
   * Find class by ID with relations.
   */
  static async findById(id: string) {
    return prisma.class.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, fullName: true, email: true, department: true } },
        members: {
          where: { status: MembershipStatus.ACTIVE },
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
              },
            },
          },
          orderBy: { joinedAt: 'desc' },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { submissions: true } },
          },
        },
        _count: {
          select: {
            members: { where: { status: MembershipStatus.ACTIVE } },
            assignments: true,
          },
        },
      },
    });
  }

  /**
   * Find class by code.
   */
  static async findByCode(classCode: string): Promise<Class | null> {
    return prisma.class.findUnique({
      where: { classCode: classCode.toUpperCase().trim() },
      include: {
        teacher: { select: { id: true, fullName: true, email: true, department: true } },
      },
    });
  }

  /**
   * List all classes taught by a teacher.
   */
  static async listByTeacher(teacherId: string, includeArchived = false) {
    return prisma.class.findMany({
      where: {
        teacherId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            members: { where: { status: MembershipStatus.ACTIVE } },
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List all active classes a student is enrolled in.
   */
  static async listByStudent(studentId: string) {
    const memberships = await prisma.classMember.findMany({
      where: {
        studentId,
        status: MembershipStatus.ACTIVE,
        class: { isArchived: false },
      },
      include: {
        class: {
          include: {
            teacher: { select: { id: true, fullName: true, email: true, department: true } },
            _count: {
              select: {
                members: { where: { status: MembershipStatus.ACTIVE } },
                assignments: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      membershipId: m.id,
      joinedAt: m.joinedAt,
      ...m.class,
    }));
  }

  /**
   * Updates class details (Teacher ownership verified).
   */
  static async updateClass(classId: string, teacherId: string, data: UpdateClassInput, isAdmin = false) {
    const existing = await prisma.class.findUnique({ where: { id: classId } });
    if (!existing) {
      throw { status: 404, message: 'Class not found' };
    }
    if (existing.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not have permission to modify this class' };
    }

    const updated = await prisma.class.update({
      where: { id: classId },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        description: data.description !== undefined ? data.description.trim() : undefined,
        subject: data.subject !== undefined ? data.subject.trim() : undefined,
        department: data.department !== undefined ? data.department.trim() : undefined,
        semester: data.semester !== undefined ? data.semester.trim() : undefined,
        section: data.section !== undefined ? data.section.trim() : undefined,
        academicYear: data.academicYear !== undefined ? data.academicYear.trim() : undefined,
        isArchived: data.isArchived !== undefined ? data.isArchived : undefined,
      },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        _count: { select: { members: { where: { status: MembershipStatus.ACTIVE } }, assignments: true } },
      },
    });

    // Notify room of update
    emitToRoom(`class_${classId}`, data.isArchived ? 'class_archived' : 'class_updated', {
      classId,
      name: updated.name,
      isArchived: updated.isArchived,
    });

    // Record activity
    await prisma.activityLog.create({
      data: {
        userId: teacherId,
        action: data.isArchived ? 'CLASS_ARCHIVED' : 'CLASS_UPDATED',
        entityType: 'CLASS',
        entityId: classId,
        metadata: { changes: JSON.parse(JSON.stringify(data)) },
      },
    });

    return updated;
  }

  /**
   * Regenerates a unique joining code for a class (Teacher ownership verified).
   */
  static async regenerateCode(classId: string, teacherId: string, isAdmin = false) {
    const existing = await prisma.class.findUnique({ where: { id: classId } });
    if (!existing) {
      throw { status: 404, message: 'Class not found' };
    }
    if (existing.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not have permission to regenerate code for this class' };
    }

    const newCode = await this.generateUniqueCode();

    const updated = await prisma.class.update({
      where: { id: classId },
      data: { classCode: newCode },
      select: { id: true, name: true, classCode: true },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: teacherId,
        action: 'CLASS_CODE_REGENERATED',
        entityType: 'CLASS',
        entityId: classId,
        metadata: { previousCode: existing.classCode, newCode },
      },
    });

    return updated;
  }

  /**
   * Student joins a class via valid code.
   */
  static async joinClassByCode(classCode: string, studentId: string) {
    const cleanCode = classCode.toUpperCase().trim();
    const targetClass = await prisma.class.findUnique({
      where: { classCode: cleanCode },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!targetClass) {
      throw { status: 404, message: 'Invalid class code. Please check and try again.' };
    }

    if (targetClass.isArchived) {
      throw { status: 400, message: 'This class has been archived and is no longer accepting new students.' };
    }

    // Check existing membership
    const existingMembership = await prisma.classMember.findUnique({
      where: {
        classId_studentId: {
          classId: targetClass.id,
          studentId,
        },
      },
    });

    let membership: ClassMember;

    if (existingMembership) {
      if (existingMembership.status === MembershipStatus.ACTIVE) {
        throw { status: 409, message: 'You are already enrolled in this class.' };
      }
      // Re-enroll if previously removed
      membership = await prisma.classMember.update({
        where: { id: existingMembership.id },
        data: {
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date(),
          removedAt: null,
        },
      });
    } else {
      // First-time enrollment
      membership = await prisma.classMember.create({
        data: {
          classId: targetClass.id,
          studentId,
          status: MembershipStatus.ACTIVE,
        },
      });
    }

    const studentUser = await prisma.user.findUnique({
      where: { id: studentId },
      select: { fullName: true, email: true, studentId: true },
    });

    // Create persistent notification for teacher
    await NotificationService.createNotification({
      userId: targetClass.teacherId,
      title: 'New Student Joined Class',
      message: `${studentUser?.fullName || 'A student'} joined "${targetClass.name}" using code ${cleanCode}.`,
      type: 'STUDENT_JOINED',
      entityId: targetClass.id,
      link: `/teacher/classes/${targetClass.id}/students`,
    });

    // Real-time notification to teacher & room
    emitToRoom(`class_${targetClass.id}`, 'student_joined', {
      classId: targetClass.id,
      studentId,
      studentName: studentUser?.fullName,
    });
    emitToUser(targetClass.teacherId, 'student_joined', {
      classId: targetClass.id,
      studentId,
      studentName: studentUser?.fullName,
      className: targetClass.name,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: studentId,
        action: 'STUDENT_JOINED_CLASS',
        entityType: 'CLASS',
        entityId: targetClass.id,
        metadata: { classCode: cleanCode, className: targetClass.name },
      },
    });

    return {
      membership,
      class: {
        id: targetClass.id,
        name: targetClass.name,
        subject: targetClass.subject,
        teacherName: targetClass.teacher.fullName,
      },
    };
  }

  /**
   * Get enrolled students for a class with search and filter.
   */
  static async getEnrolledStudents(classId: string, teacherId: string, search = '', isAdmin = false) {
    const targetClass = await prisma.class.findUnique({ where: { id: classId } });
    if (!targetClass) {
      throw { status: 404, message: 'Class not found' };
    }
    if (targetClass.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not have permission to view students of this class' };
    }

    const where: any = {
      classId,
      status: MembershipStatus.ACTIVE,
    };

    if (search.trim()) {
      where.student = {
        OR: [
          { fullName: { contains: search.trim(), mode: 'insensitive' } },
          { email: { contains: search.trim(), mode: 'insensitive' } },
          { studentId: { contains: search.trim(), mode: 'insensitive' } },
        ],
      };
    }

    const members = await prisma.classMember.findMany({
      where,
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
      },
      orderBy: { joinedAt: 'desc' },
    });

    return members.map((m) => ({
      membershipId: m.id,
      joinedAt: m.joinedAt,
      status: m.status,
      ...m.student,
    }));
  }

  /**
   * Teacher removes a student from a class.
   * Preserves historical submissions and grades; updates status to REMOVED.
   */
  static async removeStudent(classId: string, studentId: string, teacherId: string, isAdmin = false) {
    const targetClass = await prisma.class.findUnique({ where: { id: classId } });
    if (!targetClass) {
      throw { status: 404, message: 'Class not found' };
    }
    if (targetClass.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not have permission to remove students from this class' };
    }

    const membership = await prisma.classMember.findUnique({
      where: {
        classId_studentId: {
          classId,
          studentId,
        },
      },
    });

    if (!membership || membership.status === MembershipStatus.REMOVED) {
      throw { status: 404, message: 'Student is not an active member of this class' };
    }

    // Soft remove: preserve records, revoke active membership
    const updated = await prisma.classMember.update({
      where: { id: membership.id },
      data: {
        status: MembershipStatus.REMOVED,
        removedAt: new Date(),
      },
    });

    // Notify student in PostgreSQL and via real-time socket
    await NotificationService.createNotification({
      userId: studentId,
      title: 'Removed from Class',
      message: `You were removed from the class "${targetClass.name}". Historical submissions and grades have been preserved.`,
      type: 'STUDENT_REMOVED',
      entityId: classId,
      link: '/student/classes',
    });

    // Socket real-time events
    emitToUser(studentId, 'student_removed', {
      classId,
      className: targetClass.name,
    });
    emitToRoom(`class_${classId}`, 'member_removed', {
      classId,
      studentId,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: teacherId,
        action: 'STUDENT_REMOVED_FROM_CLASS',
        entityType: 'CLASS_MEMBER',
        entityId: membership.id,
        metadata: { classId, studentId, className: targetClass.name },
      },
    });

    return updated;
  }
}
