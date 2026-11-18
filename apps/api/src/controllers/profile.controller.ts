import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';

export class ProfileController {
  /**
   * GET /api/v1/profile
   * Returns current user's profile information
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
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
          updatedAt: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/profile
   * Updates user profile fields
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { fullName, department, course, semester, section, studentId, teacherId } = req.body;

      const dataToUpdate: any = {};
      if (fullName && typeof fullName === 'string' && fullName.trim().length >= 2) {
        dataToUpdate.fullName = fullName.trim();
      }
      if (department !== undefined) dataToUpdate.department = department ? String(department).trim() : null;
      if (course !== undefined) dataToUpdate.course = course ? String(course).trim() : null;
      if (semester !== undefined) dataToUpdate.semester = semester ? String(semester).trim() : null;
      if (section !== undefined) dataToUpdate.section = section ? String(section).trim() : null;
      if (studentId !== undefined) dataToUpdate.studentId = studentId ? String(studentId).trim() : null;
      if (teacherId !== undefined) dataToUpdate.teacherId = teacherId ? String(teacherId).trim() : null;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
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
          updatedAt: true,
        },
      });

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/profile/password
   * Changes user password securely
   */
  static async updatePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Current password and new password are required' },
        });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          error: { code: 'WEAK_PASSWORD', message: 'New password must be at least 8 characters long' },
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({
          success: false,
          error: { code: 'INCORRECT_PASSWORD', message: 'Current password is incorrect' },
        });
        return;
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });

      // Revoke all existing refresh tokens for security
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      res.status(200).json({
        success: true,
        message: 'Password updated successfully. Please log in again if required.',
      });
    } catch (err) {
      next(err);
    }
  }
}
