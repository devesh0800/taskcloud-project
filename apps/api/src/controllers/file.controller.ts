import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { storageService, FileCategory } from '../storage/localStorage.service';
import { prisma } from '../config/prisma';
import { Role, MembershipStatus, AssignmentStatus } from '@prisma/client';

export const uploadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const category = (req.body.category || 'resources') as FileCategory;
    const validCategories: FileCategory[] = ['assignments', 'submissions', 'profiles', 'resources'];
    if (!validCategories.includes(category)) {
      res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      });
      return;
    }

    const savedMetadata = await storageService.saveFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      category
    );

    res.status(201).json({
      success: true,
      message: 'File stored successfully on local server',
      file: {
        id: savedMetadata.id,
        originalName: savedMetadata.originalName,
        storedFileName: savedMetadata.storedFileName,
        category: savedMetadata.category,
        relativeFilePath: savedMetadata.relativeFilePath,
        mimeType: savedMetadata.mimeType,
        size: savedMetadata.size,
        uploadedAt: savedMetadata.uploadedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const downloadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, fileName } = req.params;
    const validCategories: FileCategory[] = ['assignments', 'submissions', 'profiles', 'resources'];
    if (!validCategories.includes(category as FileCategory)) {
      res.status(400).json({ success: false, message: 'Invalid file category' });
      return;
    }

    // 1. Strict Path Traversal Prevention
    if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\') || fileName.includes('\0')) {
      res.status(400).json({
        success: false,
        message: 'Invalid filename: directory traversal characters are prohibited',
      });
      return;
    }

    const sanitizedBase = path.basename(fileName);
    if (sanitizedBase !== fileName) {
      res.status(400).json({
        success: false,
        message: 'Invalid filename syntax',
      });
      return;
    }

    // 2. Authorization Check for Sensitive Categories
    const currentUser = req.user;

    if (category === 'submissions') {
      if (!currentUser) {
        res.status(401).json({ success: false, message: 'Authentication required to access submission files' });
        return;
      }

      // If not Admin, check student ownership or class teacher ownership
      if (currentUser.role !== Role.ADMIN) {
        const subFile = await prisma.submissionFile.findFirst({
          where: { fileName: sanitizedBase },
          include: {
            submission: {
              select: {
                studentId: true,
                assignment: {
                  select: {
                    teacherId: true,
                    class: { select: { teacherId: true } },
                  },
                },
              },
            },
          },
        });

        if (subFile) {
          if (currentUser.role === Role.STUDENT && subFile.submission.studentId !== currentUser.userId) {
            res.status(403).json({
              success: false,
              message: 'Forbidden: You do not have permission to view other students’ submissions',
            });
            return;
          }

          if (
            currentUser.role === Role.TEACHER &&
            subFile.submission.assignment.teacherId !== currentUser.userId &&
            subFile.submission.assignment.class.teacherId !== currentUser.userId
          ) {
            res.status(403).json({
              success: false,
              message: 'Forbidden: You do not have permission to access submissions for this class',
            });
            return;
          }
        }
      }
    } else if (category === 'assignments') {
      if (!currentUser) {
        res.status(401).json({ success: false, message: 'Authentication required to access assignment files' });
        return;
      }

      if (currentUser.role !== Role.ADMIN) {
        const att = await prisma.assignmentAttachment.findFirst({
          where: { fileName: sanitizedBase },
          include: {
            assignment: {
              select: {
                teacherId: true,
                status: true,
                classId: true,
              },
            },
          },
        });

        if (att) {
          if (currentUser.role === Role.TEACHER && att.assignment.teacherId !== currentUser.userId) {
            res.status(403).json({
              success: false,
              message: 'Forbidden: You do not teach the class for this assignment',
            });
            return;
          }

          if (currentUser.role === Role.STUDENT) {
            if (att.assignment.status === AssignmentStatus.DRAFT) {
              res.status(403).json({
                success: false,
                message: 'Forbidden: Assignment is unpublished draft',
              });
              return;
            }

            const isMember = await prisma.classMember.findFirst({
              where: {
                classId: att.assignment.classId,
                studentId: currentUser.userId,
                status: MembershipStatus.ACTIVE,
              },
            });

            if (!isMember) {
              res.status(403).json({
                success: false,
                message: 'Forbidden: You are not enrolled in the class for this assignment',
              });
              return;
            }
          }
        }
      }
    }

    const absolutePath = await storageService.getFilePath(category as FileCategory, sanitizedBase);
    res.download(absolutePath);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (error.message?.includes('path traversal') || error.message?.includes('Access denied')) {
      res.status(403).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};
