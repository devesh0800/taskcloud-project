import { prisma } from '../config/prisma';
import { Role, MembershipStatus, AssignmentStatus, SubmissionStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { AnalyticsService } from './analytics.service';

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class ReportService {
  /**
   * 1. Class Performance Report
   */
  static async getClassReportData(classId: string, teacherId: string, isAdmin = false) {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: { select: { fullName: true, email: true, department: true } },
        members: {
          where: { status: MembershipStatus.ACTIVE },
          include: {
            student: {
              select: { id: true, fullName: true, email: true, studentId: true },
            },
          },
        },
        assignments: {
          where: { status: AssignmentStatus.PUBLISHED },
          orderBy: { createdAt: 'desc' },
          include: {
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
        },
      },
    });

    if (!cls) {
      throw { status: 404, message: 'Class not found' };
    }
    if (cls.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not have permission to generate reports for this class' };
    }

    const totalStudents = cls.members.length;
    const totalAssignments = cls.assignments.length;

    let totalMarksPctSum = 0;
    let totalGradedCount = 0;

    const studentRows = cls.members.map((m) => {
      const student = m.student;
      let subsCount = 0;
      let evalCount = 0;
      let marksPctSum = 0;

      for (const assign of cls.assignments) {
        const sub = assign.submissions.find((s) => s.studentId === student.id);
        if (sub) {
          subsCount++;
          const g = sub.grades[0];
          if (g && assign.totalMarks > 0) {
            evalCount++;
            const pct = (g.marks / assign.totalMarks) * 100;
            marksPctSum += pct;
            totalMarksPctSum += pct;
            totalGradedCount++;
          }
        }
      }

      const avgPct = evalCount > 0 ? Math.round(marksPctSum / evalCount) : 0;
      const completionRate = totalAssignments > 0 ? Math.round((subsCount / totalAssignments) * 100) : 0;

      return {
        studentName: student.fullName,
        studentId: student.studentId || 'N/A',
        email: student.email,
        submissionsCount: subsCount,
        evaluatedCount: evalCount,
        averagePercentage: avgPct,
        letterGrade: avgPct > 0 ? AnalyticsService.getLetterGrade(avgPct) : 'N/A',
        completionRate: `${completionRate}%`,
      };
    });

    const classAverage = totalGradedCount > 0 ? Math.round((totalMarksPctSum / totalGradedCount) * 10) / 10 : 0;

    return {
      platform: 'EduSync Cloud Academic Platform',
      reportType: 'Class Academic Performance & Grade Distribution Report',
      generatedAt: new Date().toISOString(),
      classInfo: {
        id: cls.id,
        name: cls.name,
        code: cls.classCode,
        subject: cls.subject,
        department: cls.department || 'N/A',
        semester: cls.semester || 'N/A',
        section: cls.section || 'N/A',
        teacher: cls.teacher.fullName,
        totalStudents,
        totalAssignments,
        classAveragePercentage: classAverage,
        classAverageGrade: totalGradedCount > 0 ? AnalyticsService.getLetterGrade(classAverage) : 'N/A',
      },
      students: studentRows,
    };
  }

  /**
   * Convert Class Report to CSV
   */
  static generateClassReportCSV(reportData: any): string {
    const lines: string[] = [];
    lines.push(`"EduSync — Class Academic Performance Report"`);
    lines.push(`"Generated At:","${new Date(reportData.generatedAt).toLocaleString()}"`);
    lines.push(`"Class:","${reportData.classInfo.name} (${reportData.classInfo.code})"`);
    lines.push(`"Subject:","${reportData.classInfo.subject}"`);
    lines.push(`"Teacher:","${reportData.classInfo.teacher}"`);
    lines.push(`"Class Average:","${reportData.classInfo.classAveragePercentage}% (${reportData.classInfo.classAverageGrade})"`);
    lines.push('');
    lines.push(['Student Name', 'Student ID', 'Email', 'Submissions', 'Evaluated', 'Average (%)', 'Letter Grade', 'Completion Rate'].map(escapeCsv).join(','));

    for (const s of reportData.students) {
      lines.push([
        escapeCsv(s.studentName),
        escapeCsv(s.studentId),
        escapeCsv(s.email),
        escapeCsv(s.submissionsCount),
        escapeCsv(s.evaluatedCount),
        escapeCsv(s.averagePercentage),
        escapeCsv(s.letterGrade),
        escapeCsv(s.completionRate),
      ].join(','));
    }

    return lines.join('\r\n');
  }

  /**
   * Convert Class Report to PDF Buffer
   */
  static async generateClassReportPDF(reportData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // EduSync Header Banner
        doc.rect(40, 40, 515, 60).fill('#172554');
        doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text('EduSync Academic Report', 55, 52);
        doc.fontSize(10).font('Helvetica').text('Class Academic Performance & Evaluation Audit', 55, 75);
        doc.fontSize(8).text(`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`, 400, 75);

        doc.moveDown(3);

        // Metadata Box
        doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('Class Overview', 40, 115);
        doc.rect(40, 130, 515, 65).fill('#F8FAFC').stroke('#E2E8F0');

        doc.fillColor('#334155').fontSize(9).font('Helvetica');
        doc.text(`Class Name: ${reportData.classInfo.name}`, 50, 140);
        doc.text(`Class Code: ${reportData.classInfo.code}`, 50, 155);
        doc.text(`Subject: ${reportData.classInfo.subject}`, 50, 170);

        doc.text(`Teacher: ${reportData.classInfo.teacher}`, 260, 140);
        doc.text(`Total Enrolled: ${reportData.classInfo.totalStudents} Students`, 260, 155);
        doc.text(`Class Average: ${reportData.classInfo.classAveragePercentage}% (${reportData.classInfo.classAverageGrade})`, 260, 170);

        // Student Table Header
        let y = 215;
        doc.rect(40, y, 515, 22).fill('#2563EB');
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
        doc.text('Student Name', 45, y + 6);
        doc.text('ID', 170, y + 6);
        doc.text('Submissions', 230, y + 6);
        doc.text('Evaluated', 300, y + 6);
        doc.text('Average (%)', 370, y + 6);
        doc.text('Grade', 440, y + 6);
        doc.text('Completion', 490, y + 6);

        // Table Rows
        y += 24;
        doc.font('Helvetica').fontSize(8);

        for (let i = 0; i < reportData.students.length; i++) {
          const s = reportData.students[i];
          if (y > 750) {
            doc.addPage();
            y = 50;
          }

          if (i % 2 === 0) {
            doc.rect(40, y - 2, 515, 18).fill('#F1F5F9');
          }

          doc.fillColor('#0F172A');
          doc.text(s.studentName.slice(0, 24), 45, y + 2);
          doc.text(s.studentId, 170, y + 2);
          doc.text(String(s.submissionsCount), 230, y + 2);
          doc.text(String(s.evaluatedCount), 300, y + 2);
          doc.text(`${s.averagePercentage}%`, 370, y + 2);
          doc.text(s.letterGrade, 440, y + 2);
          doc.text(s.completionRate, 490, y + 2);

          y += 20;
        }

        // Footer note
        doc.fillColor('#94A3B8').fontSize(8).text(
          'Confidential: This report is generated from Neon PostgreSQL database records by EduSync Platform.',
          40,
          780,
          { align: 'center', width: 515 }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 2. Individual Student Performance Report
   */
  static async getStudentReportData(
    studentId: string,
    requestingUser: { userId: string; role: Role }
  ) {
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: Role.STUDENT },
      select: {
        id: true,
        fullName: true,
        email: true,
        studentId: true,
        department: true,
        course: true,
        semester: true,
        section: true,
      },
    });

    if (!student) {
      throw { status: 404, message: 'Student not found' };
    }

    // Authorization check:
    // Student can only see own report. Teacher must teach student in at least one class. Admin allowed.
    if (requestingUser.role === Role.STUDENT && requestingUser.userId !== studentId) {
      throw { status: 403, message: 'Access denied: You can only view your own academic report' };
    }

    if (requestingUser.role === Role.TEACHER) {
      const commonClass = await prisma.classMember.findFirst({
        where: {
          studentId,
          status: MembershipStatus.ACTIVE,
          class: { teacherId: requestingUser.userId },
        },
      });
      if (!commonClass) {
        throw { status: 403, message: 'You do not have permission to view reports for this student' };
      }
    }

    // Query submissions with published grades only
    const submissions = await prisma.submission.findMany({
      where: {
        studentId,
        assignment: requestingUser.role === Role.TEACHER ? { teacherId: requestingUser.userId } : {},
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            subject: true,
            totalMarks: true,
            deadline: true,
            class: { select: { name: true, classCode: true } },
          },
        },
        grades: {
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    let totalPct = 0;
    let evalCount = 0;

    const assignmentRows = submissions.map((s) => {
      const g = s.grades[0];
      const isLate = s.submittedAt && s.assignment.deadline && s.submittedAt > s.assignment.deadline;
      let pct = 0;
      let letter = 'Pending Evaluation';

      if (g && s.assignment.totalMarks > 0) {
        pct = Math.round((g.marks / s.assignment.totalMarks) * 100);
        letter = g.grade || AnalyticsService.getLetterGrade(pct);
        totalPct += pct;
        evalCount++;
      }

      return {
        assignmentTitle: s.assignment.title,
        className: s.assignment.class.name,
        submittedAt: s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : 'N/A',
        isLate: isLate ? 'Late' : 'On Time',
        marks: g ? g.marks : 'Pending',
        totalMarks: s.assignment.totalMarks,
        percentage: g ? `${pct}%` : 'Pending',
        letterGrade: letter,
        feedback: g?.feedback || 'No feedback remarks provided.',
      };
    });

    const overallAverage = evalCount > 0 ? Math.round(totalPct / evalCount) : 0;

    return {
      platform: 'EduSync Cloud Academic Platform',
      reportType: 'Official Student Academic Transcript & Performance Record',
      generatedAt: new Date().toISOString(),
      student,
      summary: {
        totalSubmissions: submissions.length,
        evaluatedSubmissions: evalCount,
        overallAveragePercentage: overallAverage,
        cumulativeGrade: evalCount > 0 ? AnalyticsService.getLetterGrade(overallAverage) : 'N/A',
      },
      assignments: assignmentRows,
    };
  }

  /**
   * Convert Student Report to CSV
   */
  static generateStudentReportCSV(reportData: any): string {
    const lines: string[] = [];
    lines.push(`"EduSync — Official Student Academic Performance Report"`);
    lines.push(`"Generated At:","${new Date(reportData.generatedAt).toLocaleString()}"`);
    lines.push(`"Student:","${reportData.student.fullName}"`);
    lines.push(`"Student ID:","${reportData.student.studentId || 'N/A'}"`);
    lines.push(`"Email:","${reportData.student.email}"`);
    lines.push(`"Overall Average:","${reportData.summary.overallAveragePercentage}% (${reportData.summary.cumulativeGrade})"`);
    lines.push('');
    lines.push(['Assignment Title', 'Class', 'Submission Date', 'Submission Status', 'Marks', 'Total', 'Percentage', 'Grade', 'Teacher Feedback'].map(escapeCsv).join(','));

    for (const a of reportData.assignments) {
      lines.push([
        escapeCsv(a.assignmentTitle),
        escapeCsv(a.className),
        escapeCsv(a.submittedAt),
        escapeCsv(a.isLate),
        escapeCsv(a.marks),
        escapeCsv(a.totalMarks),
        escapeCsv(a.percentage),
        escapeCsv(a.letterGrade),
        escapeCsv(a.feedback),
      ].join(','));
    }

    return lines.join('\r\n');
  }

  /**
   * Convert Student Report to PDF
   */
  static async generateStudentReportPDF(reportData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header Banner
        doc.rect(40, 40, 515, 60).fill('#172554');
        doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text('EduSync Academic Transcript', 55, 52);
        doc.fontSize(10).font('Helvetica').text('Individual Student Performance & Feedback Portfolio', 55, 75);
        doc.fontSize(8).text(`Date: ${new Date(reportData.generatedAt).toLocaleDateString()}`, 420, 75);

        // Student Info Box
        doc.rect(40, 120, 515, 65).fill('#F8FAFC').stroke('#E2E8F0');
        doc.fillColor('#334155').fontSize(9).font('Helvetica');
        doc.text(`Student: ${reportData.student.fullName}`, 50, 130);
        doc.text(`Student ID: ${reportData.student.studentId || 'N/A'}`, 50, 145);
        doc.text(`Course: ${reportData.student.course || 'N/A'}`, 50, 160);

        doc.text(`Email: ${reportData.student.email}`, 260, 130);
        doc.text(`Evaluated: ${reportData.summary.evaluatedSubmissions} of ${reportData.summary.totalSubmissions}`, 260, 145);
        doc.text(`Cumulative Grade: ${reportData.summary.overallAveragePercentage}% (${reportData.summary.cumulativeGrade})`, 260, 160);

        // Assignments Table Header
        let y = 205;
        doc.rect(40, y, 515, 20).fill('#2563EB');
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
        doc.text('Assignment', 45, y + 6);
        doc.text('Class', 180, y + 6);
        doc.text('Date', 270, y + 6);
        doc.text('Score', 330, y + 6);
        doc.text('Grade', 380, y + 6);
        doc.text('Teacher Feedback', 420, y + 6);

        // Table Rows
        y += 22;
        doc.font('Helvetica').fontSize(8);

        for (let i = 0; i < reportData.assignments.length; i++) {
          const a = reportData.assignments[i];
          if (y > 740) {
            doc.addPage();
            y = 50;
          }

          if (i % 2 === 0) {
            doc.rect(40, y - 2, 515, 22).fill('#F1F5F9');
          }

          doc.fillColor('#0F172A');
          doc.text(a.assignmentTitle.slice(0, 24), 45, y + 4);
          doc.text(a.className.slice(0, 16), 180, y + 4);
          doc.text(a.submittedAt, 270, y + 4);
          doc.text(`${a.marks}/${a.totalMarks}`, 330, y + 4);
          doc.text(a.letterGrade, 380, y + 4);
          doc.fillColor('#475569').text(a.feedback.slice(0, 26), 420, y + 4);

          y += 24;
        }

        doc.fillColor('#94A3B8').fontSize(8).text(
          'Official record generated securely by EduSync Academic Platform.',
          40,
          780,
          { align: 'center', width: 515 }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 3. Assignment Performance Report
   */
  static async getAssignmentReportData(assignmentId: string, teacherId: string, isAdmin = false) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            classCode: true,
            teacherId: true,
            members: {
              where: { status: MembershipStatus.ACTIVE },
              include: {
                student: { select: { id: true, fullName: true, email: true, studentId: true } },
              },
            },
          },
        },
        submissions: {
          include: {
            student: { select: { id: true, fullName: true, email: true, studentId: true } },
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
    if (assignment.teacherId !== teacherId && !isAdmin) {
      throw { status: 403, message: 'You do not have permission to generate reports for this assignment' };
    }

    const totalStudents = assignment.class.members.length;
    const totalSubmissions = assignment.submissions.length;

    let marksSum = 0;
    let evalCount = 0;
    let high = 0;
    let low = assignment.totalMarks;

    const studentSubmissions = assignment.submissions.map((sub) => {
      const g = sub.grades[0];
      const isLate = sub.submittedAt && assignment.deadline && sub.submittedAt > assignment.deadline;

      let pct = 0;
      let letter = 'Pending';
      if (g) {
        evalCount++;
        marksSum += g.marks;
        pct = Math.round((g.marks / assignment.totalMarks) * 100);
        letter = g.grade || AnalyticsService.getLetterGrade(pct);
        if (g.marks > high) high = g.marks;
        if (g.marks < low) low = g.marks;
      }

      return {
        studentName: sub.student.fullName,
        studentId: sub.student.studentId || 'N/A',
        email: sub.student.email,
        submittedAt: sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'N/A',
        isLate: isLate ? 'Late' : 'On Time',
        status: sub.status,
        marks: g ? g.marks : 'Pending',
        percentage: g ? `${pct}%` : 'Pending',
        letterGrade: letter,
        feedback: g?.feedback || 'N/A',
      };
    });

    const averageMarks = evalCount > 0 ? Math.round((marksSum / evalCount) * 10) / 10 : 0;
    const submissionRate = totalStudents > 0 ? Math.round((totalSubmissions / totalStudents) * 100) : 0;

    return {
      platform: 'EduSync Cloud Academic Platform',
      reportType: 'Assignment Evaluation & Marks Distribution Report',
      generatedAt: new Date().toISOString(),
      assignment: {
        id: assignment.id,
        title: assignment.title,
        subject: assignment.subject,
        className: assignment.class.name,
        classCode: assignment.class.classCode,
        totalMarks: assignment.totalMarks,
        passingMarks: assignment.passingMarks || 'N/A',
        deadline: assignment.deadline ? new Date(assignment.deadline).toLocaleString() : 'No deadline',
        totalStudents,
        totalSubmissions,
        submissionRate: `${submissionRate}%`,
        evaluatedCount: evalCount,
        averageMarks,
        averagePercentage: Math.round((averageMarks / assignment.totalMarks) * 100),
        highestMarks: evalCount > 0 ? high : 0,
        lowestMarks: evalCount > 0 ? low : 0,
      },
      submissions: studentSubmissions,
    };
  }

  /**
   * Convert Assignment Report to CSV
   */
  static generateAssignmentReportCSV(reportData: any): string {
    const lines: string[] = [];
    lines.push(`"EduSync — Assignment Evaluation Report"`);
    lines.push(`"Assignment:","${reportData.assignment.title}"`);
    lines.push(`"Class:","${reportData.assignment.className} (${reportData.assignment.classCode})"`);
    lines.push(`"Total Marks:","${reportData.assignment.totalMarks}"`);
    lines.push(`"Average Score:","${reportData.assignment.averageMarks} / ${reportData.assignment.totalMarks} (${reportData.assignment.averagePercentage}%)"`);
    lines.push(`"Submission Rate:","${reportData.assignment.submissionRate}"`);
    lines.push('');
    lines.push(['Student Name', 'Student ID', 'Email', 'Submission Time', 'Timing', 'Marks', 'Percentage', 'Grade', 'Teacher Feedback'].map(escapeCsv).join(','));

    for (const s of reportData.submissions) {
      lines.push([
        escapeCsv(s.studentName),
        escapeCsv(s.studentId),
        escapeCsv(s.email),
        escapeCsv(s.submittedAt),
        escapeCsv(s.isLate),
        escapeCsv(s.marks),
        escapeCsv(s.percentage),
        escapeCsv(s.letterGrade),
        escapeCsv(s.feedback),
      ].join(','));
    }

    return lines.join('\r\n');
  }

  /**
   * Convert Assignment Report to PDF
   */
  static async generateAssignmentReportPDF(reportData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header Banner
        doc.rect(40, 40, 515, 60).fill('#172554');
        doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text('EduSync Assignment Report', 55, 52);
        doc.fontSize(10).font('Helvetica').text('Assessment Analytics & Submission Audit', 55, 75);
        doc.fontSize(8).text(`Date: ${new Date(reportData.generatedAt).toLocaleDateString()}`, 420, 75);

        // Assignment Info Box
        doc.rect(40, 120, 515, 65).fill('#F8FAFC').stroke('#E2E8F0');
        doc.fillColor('#334155').fontSize(9).font('Helvetica');
        doc.text(`Assignment: ${reportData.assignment.title}`, 50, 130);
        doc.text(`Class: ${reportData.assignment.className}`, 50, 145);
        doc.text(`Total Marks: ${reportData.assignment.totalMarks}`, 50, 160);

        doc.text(`Submissions: ${reportData.assignment.totalSubmissions} (${reportData.assignment.submissionRate})`, 260, 130);
        doc.text(`Average: ${reportData.assignment.averageMarks} / ${reportData.assignment.totalMarks} (${reportData.assignment.averagePercentage}%)`, 260, 145);
        doc.text(`High / Low: ${reportData.assignment.highestMarks} / ${reportData.assignment.lowestMarks}`, 260, 160);

        // Submissions Table Header
        let y = 205;
        doc.rect(40, y, 515, 20).fill('#2563EB');
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
        doc.text('Student Name', 45, y + 6);
        doc.text('ID', 180, y + 6);
        doc.text('Timing', 250, y + 6);
        doc.text('Score', 310, y + 6);
        doc.text('Grade', 370, y + 6);
        doc.text('Feedback', 420, y + 6);

        // Table Rows
        y += 22;
        doc.font('Helvetica').fontSize(8);

        for (let i = 0; i < reportData.submissions.length; i++) {
          const s = reportData.submissions[i];
          if (y > 740) {
            doc.addPage();
            y = 50;
          }

          if (i % 2 === 0) {
            doc.rect(40, y - 2, 515, 20).fill('#F1F5F9');
          }

          doc.fillColor('#0F172A');
          doc.text(s.studentName.slice(0, 24), 45, y + 4);
          doc.text(s.studentId, 180, y + 4);
          doc.text(s.isLate, 250, y + 4);
          doc.text(String(s.marks), 310, y + 4);
          doc.text(s.letterGrade, 370, y + 4);
          doc.fillColor('#475569').text(s.feedback.slice(0, 26), 420, y + 4);

          y += 22;
        }

        doc.fillColor('#94A3B8').fontSize(8).text(
          'Official assignment audit report generated by EduSync Academic Platform.',
          40,
          780,
          { align: 'center', width: 515 }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
