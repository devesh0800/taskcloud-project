import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';
import { Role } from '@prisma/client';

export class ReportController {
  /**
   * GET /api/v1/reports/class/:classId
   */
  static async getClassReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { classId } = req.params;
      const format = (req.query.format as string) || 'json';
      const isAdmin = user.role === Role.ADMIN;

      const reportData = await ReportService.getClassReportData(classId, user.userId, isAdmin);

      if (format.toLowerCase() === 'csv') {
        const csv = ReportService.generateClassReportCSV(reportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="edusync-class-report-${classId.slice(0, 8)}.csv"`);
        res.status(200).send(csv);
        return;
      }

      if (format.toLowerCase() === 'pdf') {
        const pdfBuffer = await ReportService.generateClassReportPDF(reportData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="edusync-class-report-${classId.slice(0, 8)}.pdf"`);
        res.status(200).send(pdfBuffer);
        return;
      }

      res.status(200).json({ success: true, data: reportData });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * GET /api/v1/reports/student/:studentId
   */
  static async getStudentReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { studentId } = req.params;
      const format = (req.query.format as string) || 'json';

      const reportData = await ReportService.getStudentReportData(studentId, {
        userId: user.userId,
        role: user.role,
      });

      if (format.toLowerCase() === 'csv') {
        const csv = ReportService.generateStudentReportCSV(reportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="edusync-student-report-${studentId.slice(0, 8)}.csv"`);
        res.status(200).send(csv);
        return;
      }

      if (format.toLowerCase() === 'pdf') {
        const pdfBuffer = await ReportService.generateStudentReportPDF(reportData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="edusync-student-report-${studentId.slice(0, 8)}.pdf"`);
        res.status(200).send(pdfBuffer);
        return;
      }

      res.status(200).json({ success: true, data: reportData });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }

  /**
   * GET /api/v1/reports/assignment/:assignmentId
   */
  static async getAssignmentReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { assignmentId } = req.params;
      const format = (req.query.format as string) || 'json';
      const isAdmin = user.role === Role.ADMIN;

      const reportData = await ReportService.getAssignmentReportData(assignmentId, user.userId, isAdmin);

      if (format.toLowerCase() === 'csv') {
        const csv = ReportService.generateAssignmentReportCSV(reportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="edusync-assignment-report-${assignmentId.slice(0, 8)}.csv"`);
        res.status(200).send(csv);
        return;
      }

      if (format.toLowerCase() === 'pdf') {
        const pdfBuffer = await ReportService.generateAssignmentReportPDF(reportData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="edusync-assignment-report-${assignmentId.slice(0, 8)}.pdf"`);
        res.status(200).send(pdfBuffer);
        return;
      }

      res.status(200).json({ success: true, data: reportData });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ success: false, error: { message: err.message } });
        return;
      }
      next(err);
    }
  }
}
