import { prisma } from '../config/prisma';
import { Role, SubmissionStatus, MembershipStatus, AssignmentStatus } from '@prisma/client';

export interface DateFilterOptions {
  classId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

export class AnalyticsService {
  /**
   * Helper: Calculate letter grade from percentage
   */
  static getLetterGrade(pct: number): string {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  }

  /**
   * 1. Teacher Overview Analytics
   */
  static async getTeacherOverview(teacherId: string, options: DateFilterOptions = {}) {
    // Verify teacher exists
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { id: true, fullName: true, email: true, department: true },
    });
    if (!teacher) {
      throw { status: 404, message: 'Teacher not found' };
    }

    const classWhere: any = { teacherId };
    if (options.classId) {
      classWhere.id = options.classId;
    }

    // 1. Classes taught
    const classes = await prisma.class.findMany({
      where: classWhere,
      select: {
        id: true,
        name: true,
        classCode: true,
        subject: true,
        isArchived: true,
        _count: {
          select: {
            members: { where: { status: MembershipStatus.ACTIVE } },
            assignments: true,
          },
        },
      },
    });

    const classIds = classes.map((c) => c.id);

    if (classIds.length === 0) {
      return {
        overall: {
          totalClasses: 0,
          totalStudents: 0,
          totalAssignments: 0,
          publishedAssignments: 0,
          totalSubmissions: 0,
          pendingEvaluations: 0,
          evaluatedSubmissions: 0,
          averagePerformance: 0,
          averageGrade: 'N/A',
          completionRate: 0,
        },
        gradeDistribution: { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 },
        performanceTrends: [],
        submissionStatusBreakdown: { evaluated: 0, underReview: 0, pending: 0 },
        studentsRequiringAttention: [],
        classes: [],
      };
    }

    // 2. Total unique enrolled students
    const uniqueStudents = await prisma.classMember.findMany({
      where: {
        classId: { in: classIds },
        status: MembershipStatus.ACTIVE,
      },
      select: { studentId: true },
      distinct: ['studentId'],
    });
    const totalStudents = uniqueStudents.length;

    // 3. Assignments
    const assignmentWhere: any = {
      classId: { in: classIds },
      teacherId,
    };
    if (options.startDate || options.endDate) {
      assignmentWhere.createdAt = {};
      if (options.startDate) assignmentWhere.createdAt.gte = new Date(options.startDate);
      if (options.endDate) assignmentWhere.createdAt.lte = new Date(options.endDate);
    }

    const assignments = await prisma.assignment.findMany({
      where: assignmentWhere,
      select: {
        id: true,
        title: true,
        status: true,
        totalMarks: true,
        classId: true,
        createdAt: true,
      },
    });

    const totalAssignments = assignments.length;
    const publishedAssignments = assignments.filter((a) => a.status === AssignmentStatus.PUBLISHED).length;
    const assignmentIds = assignments.map((a) => a.id);

    // 4. Submissions
    const submissions = assignmentIds.length > 0
      ? await prisma.submission.findMany({
          where: {
            assignmentId: { in: assignmentIds },
          },
          include: {
            grades: {
              where: { isPublished: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            student: {
              select: { id: true, fullName: true, email: true, studentId: true },
            },
            assignment: {
              select: { id: true, title: true, totalMarks: true, classId: true },
            },
          },
        })
      : [];

    const totalSubmissions = submissions.length;
    const evaluatedSubmissions = submissions.filter(
      (s) => s.status === SubmissionStatus.EVALUATED || (s.grades && s.grades.length > 0)
    ).length;
    const pendingEvaluations = submissions.filter(
      (s) => s.status === SubmissionStatus.UNDER_REVIEW || (s.status === SubmissionStatus.SUBMITTED && s.grades.length === 0)
    ).length;

    // 5. Performance and Grade Distribution (Only published grades)
    const gradeDistribution: Record<string, number> = {
      'A+': 0,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };

    let totalPercentageSum = 0;
    let publishedGradeCount = 0;

    for (const sub of submissions) {
      const publishedGrade = sub.grades[0];
      if (publishedGrade) {
        publishedGradeCount++;
        const pct = sub.assignment.totalMarks > 0
          ? (publishedGrade.marks / sub.assignment.totalMarks) * 100
          : 0;
        totalPercentageSum += pct;

        const letter = publishedGrade.grade || this.getLetterGrade(pct);
        if (gradeDistribution[letter] !== undefined) {
          gradeDistribution[letter]++;
        } else {
          gradeDistribution['B']++;
        }
      }
    }

    const averagePerformance = publishedGradeCount > 0
      ? Math.round((totalPercentageSum / publishedGradeCount) * 10) / 10
      : 0;
    const averageGrade = publishedGradeCount > 0 ? this.getLetterGrade(averagePerformance) : 'N/A';

    // 6. Completion Rate = totalSubmissions / (publishedAssignments * activeStudents)
    const potentialSubmissions = publishedAssignments * totalStudents;
    const completionRate = potentialSubmissions > 0
      ? Math.min(100, Math.round((totalSubmissions / potentialSubmissions) * 100))
      : 0;

    // 7. Monthly Performance Trends (Last 6 months)
    const trendsMap = new Map<string, { totalPct: number; count: number; submissions: number }>();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      trendsMap.set(key, { totalPct: 0, count: 0, submissions: 0 });
    }

    for (const sub of submissions) {
      const date = new Date(sub.submittedAt || sub.createdAt);
      const key = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      if (trendsMap.has(key)) {
        const item = trendsMap.get(key)!;
        item.submissions++;
        if (sub.grades[0] && sub.assignment.totalMarks > 0) {
          item.totalPct += (sub.grades[0].marks / sub.assignment.totalMarks) * 100;
          item.count++;
        }
      }
    }

    const performanceTrends = Array.from(trendsMap.entries()).map(([period, data]) => ({
      period,
      average: data.count > 0 ? Math.round(data.totalPct / data.count) : averagePerformance || 75,
      submissions: data.submissions,
    }));

    // 8. Students Requiring Attention (average < 50% or low submission rate)
    const studentStatsMap = new Map<
      string,
      {
        id: string;
        fullName: string;
        email: string;
        studentId: string;
        submissions: number;
        totalPct: number;
        gradeCount: number;
      }
    >();

    for (const sub of submissions) {
      if (!studentStatsMap.has(sub.studentId)) {
        studentStatsMap.set(sub.studentId, {
          id: sub.student.id,
          fullName: sub.student.fullName,
          email: sub.student.email,
          studentId: sub.student.studentId || 'N/A',
          submissions: 0,
          totalPct: 0,
          gradeCount: 0,
        });
      }
      const st = studentStatsMap.get(sub.studentId)!;
      st.submissions++;
      if (sub.grades[0] && sub.assignment.totalMarks > 0) {
        st.totalPct += (sub.grades[0].marks / sub.assignment.totalMarks) * 100;
        st.gradeCount++;
      }
    }

    const studentsRequiringAttention: Array<{
      id: string;
      fullName: string;
      email: string;
      studentId: string;
      averagePercentage: number;
      letterGrade: string;
      submissionsCount: number;
      concern: string;
    }> = [];

    for (const [sId, st] of studentStatsMap.entries()) {
      const avg = st.gradeCount > 0 ? Math.round(st.totalPct / st.gradeCount) : 0;
      const missingCount = Math.max(0, publishedAssignments - st.submissions);

      if (avg > 0 && avg < 55) {
        studentsRequiringAttention.push({
          id: st.id,
          fullName: st.fullName,
          email: st.email,
          studentId: st.studentId,
          averagePercentage: avg,
          letterGrade: this.getLetterGrade(avg),
          submissionsCount: st.submissions,
          concern: 'Low Academic Performance (Score < 55%)',
        });
      } else if (publishedAssignments >= 2 && missingCount >= 2) {
        studentsRequiringAttention.push({
          id: st.id,
          fullName: st.fullName,
          email: st.email,
          studentId: st.studentId,
          averagePercentage: avg,
          letterGrade: avg > 0 ? this.getLetterGrade(avg) : 'N/A',
          submissionsCount: st.submissions,
          concern: `Multiple Incomplete Submissions (${missingCount} missing)`,
        });
      }
    }

    return {
      overall: {
        totalClasses: classes.length,
        totalStudents,
        totalAssignments,
        publishedAssignments,
        totalSubmissions,
        pendingEvaluations,
        evaluatedSubmissions,
        averagePerformance,
        averageGrade,
        completionRate,
      },
      gradeDistribution,
      performanceTrends,
      submissionStatusBreakdown: {
        evaluated: evaluatedSubmissions,
        underReview: pendingEvaluations,
        pending: Math.max(0, potentialSubmissions - totalSubmissions),
      },
      studentsRequiringAttention: studentsRequiringAttention.slice(0, 10),
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        classCode: c.classCode,
        subject: c.subject,
        studentCount: c._count.members,
        assignmentCount: c._count.assignments,
      })),
    };
  }

  /**
   * 2. Teacher Class Analytics
   */
  static async getTeacherClassAnalytics(classId: string, teacherId: string, isAdmin = false) {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        members: {
          where: { status: MembershipStatus.ACTIVE },
          include: {
            student: {
              select: { id: true, fullName: true, email: true, studentId: true },
            },
          },
        },
        assignments: {
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
      throw { status: 403, message: 'You do not have permission to view analytics for this class' };
    }

    const totalStudents = cls.members.length;
    const totalAssignments = cls.assignments.length;
    const publishedAssignments = cls.assignments.filter((a) => a.status === AssignmentStatus.PUBLISHED);

    // Collect all published grades across class
    const gradeDistribution: Record<string, number> = {
      'A+': 0,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };

    let totalMarksPct = 0;
    let publishedCount = 0;
    let highestPct = 0;
    let lowestPct = 100;

    // Student performance breakdown
    const studentPerformance = cls.members.map((member) => {
      const student = member.student;
      let studentSubmissionsCount = 0;
      let studentTotalPct = 0;
      let studentEvaluatedCount = 0;

      for (const assign of cls.assignments) {
        const sub = assign.submissions.find((s) => s.studentId === student.id);
        if (sub) {
          studentSubmissionsCount++;
          const grade = sub.grades[0];
          if (grade && assign.totalMarks > 0) {
            const pct = (grade.marks / assign.totalMarks) * 100;
            studentTotalPct += pct;
            studentEvaluatedCount++;

            totalMarksPct += pct;
            publishedCount++;
            if (pct > highestPct) highestPct = pct;
            if (pct < lowestPct) lowestPct = pct;

            const letter = grade.grade || this.getLetterGrade(pct);
            if (gradeDistribution[letter] !== undefined) {
              gradeDistribution[letter]++;
            } else {
              gradeDistribution['B']++;
            }
          }
        }
      }

      const avgPct = studentEvaluatedCount > 0 ? Math.round(studentTotalPct / studentEvaluatedCount) : 0;
      const completionRate = publishedAssignments.length > 0
        ? Math.round((studentSubmissionsCount / publishedAssignments.length) * 100)
        : 0;

      return {
        studentId: student.id,
        fullName: student.fullName,
        email: student.email,
        customId: student.studentId || 'N/A',
        submissionsCount: studentSubmissionsCount,
        evaluatedCount: studentEvaluatedCount,
        averagePercentage: avgPct,
        letterGrade: avgPct > 0 ? this.getLetterGrade(avgPct) : 'N/A',
        completionRate,
      };
    });

    // Assignment performance comparisons
    const assignmentAnalytics = cls.assignments.map((assign) => {
      const totalSubs = assign.submissions.length;
      let assignPctSum = 0;
      let assignEvalCount = 0;
      let assignHigh = 0;
      let assignLow = assign.totalMarks;

      for (const s of assign.submissions) {
        const g = s.grades[0];
        if (g) {
          assignEvalCount++;
          assignPctSum += (g.marks / assign.totalMarks) * 100;
          if (g.marks > assignHigh) assignHigh = g.marks;
          if (g.marks < assignLow) assignLow = g.marks;
        }
      }

      const avgPct = assignEvalCount > 0 ? Math.round(assignPctSum / assignEvalCount) : 0;
      const subRate = totalStudents > 0 ? Math.round((totalSubs / totalStudents) * 100) : 0;

      return {
        id: assign.id,
        title: assign.title,
        status: assign.status,
        totalMarks: assign.totalMarks,
        deadline: assign.deadline,
        totalSubmissions: totalSubs,
        submissionRate: subRate,
        averagePercentage: avgPct,
        highestMarks: assignEvalCount > 0 ? assignHigh : 0,
        lowestMarks: assignEvalCount > 0 ? assignLow : 0,
      };
    });

    const averagePerformance = publishedCount > 0 ? Math.round((totalMarksPct / publishedCount) * 10) / 10 : 0;

    return {
      classDetails: {
        id: cls.id,
        name: cls.name,
        classCode: cls.classCode,
        subject: cls.subject,
        department: cls.department,
        semester: cls.semester,
        section: cls.section,
        totalStudents,
        totalAssignments,
      },
      stats: {
        averagePerformance,
        averageGrade: publishedCount > 0 ? this.getLetterGrade(averagePerformance) : 'N/A',
        highestPercentage: publishedCount > 0 ? Math.round(highestPct) : 0,
        lowestPercentage: publishedCount > 0 ? Math.round(lowestPct) : 0,
        totalEvaluated: publishedCount,
      },
      gradeDistribution,
      studentPerformance,
      assignmentAnalytics,
    };
  }

  /**
   * 3. Teacher Student-Specific Analytics
   */
  static async getTeacherStudentAnalytics(studentId: string, teacherId: string, isAdmin = false) {
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: Role.STUDENT },
      select: {
        id: true,
        fullName: true,
        email: true,
        studentId: true,
        department: true,
        semester: true,
        section: true,
        course: true,
      },
    });

    if (!student) {
      throw { status: 404, message: 'Student not found' };
    }

    // Verify teacher teaches this student in at least one class
    if (!isAdmin) {
      const commonClass = await prisma.classMember.findFirst({
        where: {
          studentId,
          status: MembershipStatus.ACTIVE,
          class: { teacherId },
        },
      });

      if (!commonClass) {
        throw { status: 403, message: 'You do not have permission to view analytics for this student' };
      }
    }

    // Fetch student's submissions for this teacher's assignments
    const submissions = await prisma.submission.findMany({
      where: {
        studentId,
        assignment: isAdmin ? {} : { teacherId },
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
            deadline: true,
            class: { select: { id: true, name: true } },
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
    let lateCount = 0;

    const assignmentResults = submissions.map((s) => {
      const g = s.grades[0];
      const isLate = s.submittedAt && s.assignment.deadline && s.submittedAt > s.assignment.deadline;
      if (isLate) lateCount++;

      let pct = 0;
      let letter = 'Pending';
      if (g && s.assignment.totalMarks > 0) {
        pct = Math.round((g.marks / s.assignment.totalMarks) * 100);
        letter = g.grade || this.getLetterGrade(pct);
        totalPct += pct;
        evalCount++;
      }

      return {
        submissionId: s.id,
        assignmentId: s.assignment.id,
        assignmentTitle: s.assignment.title,
        className: s.assignment.class.name,
        submittedAt: s.submittedAt,
        isLate,
        status: s.status,
        marks: g ? g.marks : null,
        totalMarks: s.assignment.totalMarks,
        percentage: g ? pct : null,
        letterGrade: letter,
        feedback: g ? g.feedback : null,
      };
    });

    const averagePerformance = evalCount > 0 ? Math.round(totalPct / evalCount) : 0;

    return {
      student,
      summary: {
        totalSubmissions: submissions.length,
        evaluatedSubmissions: evalCount,
        lateSubmissions: lateCount,
        averagePercentage: averagePerformance,
        currentGrade: evalCount > 0 ? this.getLetterGrade(averagePerformance) : 'N/A',
      },
      assignmentResults,
    };
  }

  /**
   * 4. Student Performance Analytics
   */
  static async getStudentOverview(studentId: string) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true, email: true, studentId: true, course: true },
    });
    if (!student) {
      throw { status: 404, message: 'Student not found' };
    }

    // 1. Get student's active enrolled classes
    const enrolledClasses = await prisma.classMember.findMany({
      where: { studentId, status: MembershipStatus.ACTIVE },
      include: {
        class: {
          include: {
            teacher: { select: { fullName: true } },
            assignments: {
              where: { status: AssignmentStatus.PUBLISHED },
              select: { id: true, title: true, totalMarks: true, deadline: true, classId: true },
            },
          },
        },
      },
    });

    const totalClasses = enrolledClasses.length;
    const allPublishedAssignments = enrolledClasses.flatMap((c) =>
      c.class.assignments.map((a) => ({ ...a, className: c.class.name }))
    );
    const totalAssignmentsReceived = allPublishedAssignments.length;

    // 2. Get student submissions
    const submissions = await prisma.submission.findMany({
      where: { studentId },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
            deadline: true,
            class: { select: { id: true, name: true } },
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

    const submittedCount = submissions.length;
    const pendingCount = Math.max(0, totalAssignmentsReceived - submittedCount);

    let lateCount = 0;
    let evaluatedCount = 0;
    let totalMarksPct = 0;

    const assignmentScores = submissions.map((s) => {
      const g = s.grades[0];
      const isLate = s.submittedAt && s.assignment.deadline && s.submittedAt > s.assignment.deadline;
      if (isLate) lateCount++;

      let pct = 0;
      let letter = 'Pending';
      if (g && s.assignment.totalMarks > 0) {
        pct = Math.round((g.marks / s.assignment.totalMarks) * 100);
        letter = g.grade || this.getLetterGrade(pct);
        totalMarksPct += pct;
        evaluatedCount++;
      }

      return {
        submissionId: s.id,
        assignmentId: s.assignment.id,
        assignmentTitle: s.assignment.title,
        className: s.assignment.class.name,
        submittedAt: s.submittedAt,
        deadline: s.assignment.deadline,
        isLate,
        status: s.status,
        marks: g ? g.marks : null,
        totalMarks: s.assignment.totalMarks,
        percentage: g ? pct : null,
        letterGrade: letter,
        feedback: g ? g.feedback : null,
      };
    });

    const averagePercentage = evaluatedCount > 0 ? Math.round((totalMarksPct / evaluatedCount) * 10) / 10 : 0;
    const currentGrade = evaluatedCount > 0 ? this.getLetterGrade(averagePercentage) : 'N/A';

    // 3. Class-wise performance breakdown
    const classPerformance = enrolledClasses.map((item) => {
      const c = item.class;
      const classAssigns = c.assignments;
      const classSubs = submissions.filter((s) => s.assignment.class.id === c.id);

      let classPctSum = 0;
      let classEvalCount = 0;

      for (const s of classSubs) {
        const g = s.grades[0];
        if (g && s.assignment.totalMarks > 0) {
          classPctSum += (g.marks / s.assignment.totalMarks) * 100;
          classEvalCount++;
        }
      }

      const classAvg = classEvalCount > 0 ? Math.round(classPctSum / classEvalCount) : 0;

      return {
        classId: c.id,
        className: c.name,
        teacherName: c.teacher?.fullName || 'Teacher',
        totalAssignments: classAssigns.length,
        submittedCount: classSubs.length,
        averagePercentage: classAvg,
        currentGrade: classEvalCount > 0 ? this.getLetterGrade(classAvg) : 'N/A',
      };
    });

    // 4. Performance trends over time
    const performanceTrends = assignmentScores
      .filter((s) => s.percentage !== null)
      .slice(0, 8)
      .reverse()
      .map((s, idx) => ({
        index: idx + 1,
        title: s.assignmentTitle.length > 15 ? s.assignmentTitle.slice(0, 15) + '...' : s.assignmentTitle,
        percentage: s.percentage,
        marks: s.marks,
        totalMarks: s.totalMarks,
        grade: s.letterGrade,
      }));

    return {
      summary: {
        totalAssignmentsReceived,
        submittedAssignments: submittedCount,
        pendingAssignments: pendingCount,
        lateSubmissions: lateCount,
        evaluatedAssignments: evaluatedCount,
        overallAveragePercentage: averagePercentage,
        currentGrade,
        enrolledClassesCount: totalClasses,
      },
      classPerformance,
      assignmentScores,
      performanceTrends,
    };
  }

  /**
   * 5. Admin Overview Analytics
   */
  static async getAdminOverview() {
    const [
      totalTeachers,
      totalStudents,
      totalClasses,
      totalAssignments,
      totalSubmissions,
      evaluatedSubmissions,
      publishedGrades,
    ] = await Promise.all([
      prisma.user.count({ where: { role: Role.TEACHER } }),
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.class.count({ where: { isArchived: false } }),
      prisma.assignment.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: SubmissionStatus.EVALUATED } }),
      prisma.grade.count({ where: { isPublished: true } }),
    ]);

    // Registration trends (Last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const users = await prisma.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { role: true, createdAt: true },
    });

    const registrationMap = new Map<string, { teachers: number; students: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      registrationMap.set(key, { teachers: 0, students: 0 });
    }

    for (const u of users) {
      const d = new Date(u.createdAt);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (registrationMap.has(key)) {
        const item = registrationMap.get(key)!;
        if (u.role === Role.TEACHER) item.teachers++;
        if (u.role === Role.STUDENT) item.students++;
      }
    }

    const registrationTrends = Array.from(registrationMap.entries()).map(([month, data]) => ({
      month,
      teachers: data.teachers,
      students: data.students,
      total: data.teachers + data.students,
    }));

    // Class participation stats (top 5 classes by active members)
    const topClasses = await prisma.class.findMany({
      take: 5,
      where: { isArchived: false },
      include: {
        teacher: { select: { fullName: true } },
        _count: {
          select: {
            members: { where: { status: MembershipStatus.ACTIVE } },
            assignments: true,
          },
        },
      },
      orderBy: {
        members: { _count: 'desc' },
      },
    });

    const classParticipation = topClasses.map((c) => ({
      id: c.id,
      className: c.name,
      teacherName: c.teacher?.fullName || 'Teacher',
      studentCount: c._count.members,
      assignmentCount: c._count.assignments,
    }));

    return {
      summary: {
        totalTeachers,
        totalStudents,
        totalActiveClasses: totalClasses,
        totalAssignments,
        totalSubmissions,
        evaluatedSubmissions,
        publishedGrades,
        platformActivityIndex: totalSubmissions + totalAssignments + totalClasses,
      },
      registrationTrends,
      classParticipation,
    };
  }
}
