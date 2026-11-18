import { Request, Response, NextFunction } from 'express';
import { ClassService } from '../services/class.service';
import { Role } from '@prisma/client';

export class ClassController {
  /**
   * POST /api/v1/classes
   * Teacher creates a new class
   */
  static async createClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;
      const { name, description, subject, department, semester, section, academicYear } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Class name is required' },
        });
        return;
      }

      const newClass = await ClassService.createClass({
        name,
        description,
        subject,
        department,
        semester,
        section,
        academicYear,
        teacherId,
      });

      res.status(201).json({
        success: true,
        data: newClass,
        message: 'Class created successfully',
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * GET /api/v1/classes/teacher
   * List all classes taught by authenticated teacher
   */
  static async getTeacherClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;
      const includeArchived = req.query.includeArchived === 'true';

      const classes = await ClassService.listByTeacher(teacherId, includeArchived);

      res.status(200).json({
        success: true,
        data: classes.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          subject: c.subject,
          department: c.department,
          semester: c.semester,
          section: c.section,
          academicYear: c.academicYear,
          classCode: c.classCode,
          isArchived: c.isArchived,
          createdAt: c.createdAt,
          totalStudents: c._count.members,
          totalAssignments: c._count.assignments,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/classes/student
   * List all classes student is enrolled in
   */
  static async getStudentClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const classes = await ClassService.listByStudent(studentId);

      res.status(200).json({
        success: true,
        data: classes.map((c) => ({
          id: c.id,
          membershipId: c.membershipId,
          name: c.name,
          description: c.description,
          subject: c.subject,
          department: c.department,
          semester: c.semester,
          section: c.section,
          academicYear: c.academicYear,
          teacherName: c.teacher?.fullName,
          teacherDepartment: c.teacher?.department,
          totalAssignments: c._count?.assignments || 0,
          totalStudents: c._count?.members || 0,
          joinedAt: c.joinedAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/classes/join
   * Student joins class using code
   */
  static async joinClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const { classCode } = req.body;

      if (!classCode || typeof classCode !== 'string' || classCode.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_CODE', message: 'Class code is required' },
        });
        return;
      }

      const result = await ClassService.joinClassByCode(classCode, studentId);

      res.status(200).json({
        success: true,
        data: result,
        message: `Successfully joined ${result.class.name}!`,
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * GET /api/v1/classes/:id
   * Get class details (Role-aware)
   */
  static async getClassById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role;

      const targetClass = await ClassService.findById(id);
      if (!targetClass) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Class not found' },
        });
        return;
      }

      const isTeacherOwner = targetClass.teacherId === userId;
      const isAdmin = role === Role.ADMIN;
      const isStudentMember = targetClass.members.some((m) => m.studentId === userId);

      if (!isTeacherOwner && !isAdmin && !isStudentMember) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this class' },
        });
        return;
      }

      // If Teacher / Admin: return full management info (including joining code)
      if (isTeacherOwner || isAdmin) {
        res.status(200).json({
          success: true,
          data: {
            id: targetClass.id,
            name: targetClass.name,
            description: targetClass.description,
            subject: targetClass.subject,
            department: targetClass.department,
            semester: targetClass.semester,
            section: targetClass.section,
            academicYear: targetClass.academicYear,
            classCode: targetClass.classCode,
            isArchived: targetClass.isArchived,
            createdAt: targetClass.createdAt,
            teacher: targetClass.teacher,
            totalStudents: targetClass._count.members,
            totalAssignments: targetClass._count.assignments,
            enrolledStudents: targetClass.members.map((m) => ({
              id: m.student.id,
              fullName: m.student.fullName,
              email: m.student.email,
              studentId: m.student.studentId,
              course: m.student.course,
              semester: m.student.semester,
              section: m.student.section,
              joinedAt: m.joinedAt,
            })),
            assignments: targetClass.assignments.map((a) => ({
              id: a.id,
              title: a.title,
              totalMarks: a.totalMarks,
              deadline: a.deadline,
              status: a.status,
              submissionsCount: a._count.submissions,
            })),
          },
        });
        return;
      }

      // If Student: return clean student view (privacy-safe classmates count, assignments)
      res.status(200).json({
        success: true,
        data: {
          id: targetClass.id,
          name: targetClass.name,
          description: targetClass.description,
          subject: targetClass.subject,
          department: targetClass.department,
          semester: targetClass.semester,
          section: targetClass.section,
          academicYear: targetClass.academicYear,
          teacher: targetClass.teacher,
          totalStudents: targetClass._count.members,
          totalAssignments: targetClass._count.assignments,
          classmates: targetClass.members.map((m) => ({
            id: m.student.id,
            fullName: m.student.fullName,
          })),
          assignments: targetClass.assignments
            .filter((a) => a.status === 'PUBLISHED')
            .map((a) => ({
              id: a.id,
              title: a.title,
              totalMarks: a.totalMarks,
              deadline: a.deadline,
            })),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/classes/:id
   * Teacher edits class details or archives
   */
  static async updateClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;
      const { name, description, subject, department, semester, section, academicYear, isArchived } = req.body;

      const updated = await ClassService.updateClass(
        id,
        teacherId,
        { name, description, subject, department, semester, section, academicYear, isArchived },
        isAdmin
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: isArchived ? 'Class archived successfully' : 'Class details updated successfully',
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * POST /api/v1/classes/:id/regenerate-code
   * Teacher regenerates class code
   */
  static async regenerateCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;

      const result = await ClassService.regenerateCode(id, teacherId, isAdmin);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Class joining code regenerated successfully. Old code is now invalid.',
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * GET /api/v1/classes/:id/students
   * Teacher views enrolled students with search
   */
  static async getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;
      const search = (req.query.search as string) || '';

      const students = await ClassService.getEnrolledStudents(id, teacherId, search, isAdmin);

      res.status(200).json({
        success: true,
        data: students,
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * DELETE /api/v1/classes/:id/students/:studentId
   * Teacher removes student from class
   */
  static async removeStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: classId, studentId } = req.params;
      const teacherId = req.user!.userId;
      const isAdmin = req.user!.role === Role.ADMIN;

      await ClassService.removeStudent(classId, studentId, teacherId, isAdmin);

      res.status(200).json({
        success: true,
        message: 'Student removed from class successfully. Historical submissions and grades are preserved.',
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }
}
