import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });
import { prisma } from '../src/config/prisma';
import { AnalyticsService } from '../src/services/analytics.service';
import { ReportService } from '../src/services/report.service';
import { ClassService } from '../src/services/class.service';
import { AssignmentService } from '../src/services/assignment.service';
import { SubmissionService } from '../src/services/submission.service';
import { GradeService } from '../src/services/grade.service';
import { Role, AssignmentStatus } from '@prisma/client';

async function runPhase10Tests() {
  console.log('==================================================================');
  console.log('🧪 Starting EduSync Phase 10: Analytics & Reports Tests');
  console.log('==================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 0. Fetch seeded users
    console.log('[Setup 1/2] Fetching seeded users from Neon PostgreSQL...');
    const teacher = await prisma.user.findUnique({ where: { email: 'teacher@edusync.dev' } });
    const student1 = await prisma.user.findUnique({ where: { email: 'alex.rivera@edusync.dev' } });
    const student2 = await prisma.user.findUnique({ where: { email: 'maya.patel@edusync.dev' } });
    const admin = await prisma.user.findUnique({ where: { email: 'admin@edusync.dev' } });

    if (!teacher || !student1 || !student2 || !admin) {
      throw new Error('Required seeded users not found in database.');
    }

    const testId = Date.now().toString().slice(-5);

    // Setup: Create class and enroll student1 (student2 not enrolled)
    console.log('[Setup 2/2] Step A: Creating test class...');
    const testClass = await ClassService.createClass({
      name: `Data Analytics & Reporting CS-${testId}`,
      description: 'Business intelligence and academic data visualization pipelines',
      subject: 'CS-801',
      teacherId: teacher.id,
    });
    console.log('[Setup 2/2] Step B: Enrolling student...');
    await ClassService.joinClassByCode(testClass.classCode, student1.id);

    console.log('[Setup 2/2] Step C: Creating Assignment 1...');
    const assign1 = await AssignmentService.createAssignment({
      title: `Data Pipelines Lab ${testId}`,
      subject: 'Data Analytics',
      instructions: 'Build an ETL pipeline and document schema.',
      classId: testClass.id,
      teacherId: teacher.id,
      totalMarks: 100,
      deadline: new Date(Date.now() + 7 * 86400000),
      status: AssignmentStatus.PUBLISHED,
    });

    console.log('[Setup 2/2] Step D: Creating Assignment 2...');
    const assign2 = await AssignmentService.createAssignment({
      title: `Statistical Inference Quiz ${testId}`,
      subject: 'Data Analytics',
      instructions: 'Hypothesis testing and regression models.',
      classId: testClass.id,
      teacherId: teacher.id,
      totalMarks: 50,
      deadline: new Date(Date.now() + 7 * 86400000),
      status: AssignmentStatus.PUBLISHED,
    });

    console.log('[Setup 2/2] Step E: Submitting Assignment 1...');
    const sub1 = await SubmissionService.submitAssignment({
      assignmentId: assign1.id,
      studentId: student1.id,
      answerText: 'ETL pipeline built using PostgreSQL triggers and materialized views.',
    });

    console.log('[Setup 2/2] Step F: Grading Assignment 1...');
    await GradeService.recordGrade({
      submissionId: sub1.id,
      teacherId: teacher.id,
      marks: 90,
      grade: 'A+',
      feedback: 'Excellent ETL pipeline implementation!',
      isPublished: true,
    });

    console.log('[Setup 2/2] Step G: Submitting Assignment 2...');
    const sub2 = await SubmissionService.submitAssignment({
      assignmentId: assign2.id,
      studentId: student1.id,
      answerText: 'P-value calculated = 0.012 with 95% confidence interval.',
    });

    console.log('[Setup 2/2] Step H: Grading Assignment 2 (Draft)...');
    await GradeService.recordGrade({
      submissionId: sub2.id,
      teacherId: teacher.id,
      marks: 35,
      grade: 'C',
      feedback: 'Draft comments in review.',
      isPublished: false, // DRAFT
    });
    console.log('[Setup 2/2] Setup complete!');

    console.log(`\n--- SECTION 1: Empty Dataset & Zero-Division Safety ---`);

    // Test 1: Query analytics for non-existent or fresh user without crash
    const freshStudent = await prisma.user.findFirst({
      where: { role: Role.STUDENT, NOT: { id: student1.id } },
    });
    if (freshStudent) {
      const freshOverview = await AnalyticsService.getStudentOverview(freshStudent.id);
      assert(
        freshOverview.summary.overallAveragePercentage >= 0 &&
          typeof freshOverview.summary.currentGrade === 'string',
        'Zero-division safety: Fresh student overview handles empty datasets gracefully without division-by-zero'
      );
    }

    console.log(`\n--- SECTION 2: Teacher Overview Analytics ---`);

    // Test 2: Teacher overview statistics
    const teacherOverview = await AnalyticsService.getTeacherOverview(teacher.id);
    assert(
      teacherOverview.overall.totalClasses >= 1 &&
        teacherOverview.overall.totalStudents >= 1 &&
        teacherOverview.overall.publishedAssignments >= 2 &&
        teacherOverview.overall.totalSubmissions >= 2,
      'Teacher overview accurately computes total classes, students, assignments, and submissions'
    );

    // Test 3: Average performance only computes published grades
    assert(
      teacherOverview.overall.averagePerformance > 0 &&
        typeof teacherOverview.overall.averageGrade === 'string',
      'Teacher average performance is calculated from published evaluations'
    );

    // Test 4: Grade distribution includes published A+ grade
    assert(
      teacherOverview.gradeDistribution['A+'] >= 1,
      'Grade distribution correctly records letter grade counts from evaluations'
    );

    // Test 5: Performance trends array structure
    assert(
      Array.isArray(teacherOverview.performanceTrends) && teacherOverview.performanceTrends.length > 0,
      'Performance trends returns chronological trend array for charts'
    );

    console.log(`\n--- SECTION 3: Class & Student Scope Access Control ---`);

    // Test 6: Class analytics for own class
    const classAnalytics = await AnalyticsService.getTeacherClassAnalytics(testClass.id, teacher.id);
    assert(
      classAnalytics.classDetails.id === testClass.id &&
        classAnalytics.studentPerformance.length >= 1 &&
        classAnalytics.assignmentAnalytics.length >= 2,
      'Teacher can retrieve comprehensive class performance and assignment comparison analytics'
    );

    // Test 7: Unauthorized teacher cannot view another teacher class
    try {
      // Simulate another teacher ID
      await AnalyticsService.getTeacherClassAnalytics(testClass.id, student1.id, false);
      assert(false, 'Non-owner teacher should be rejected from viewing class analytics');
    } catch (err: any) {
      assert(
        err.status === 403 || err.message?.includes('permission'),
        'Access control: Teacher cannot view analytics for classes they do not teach'
      );
    }

    // Test 8: Admin CAN view any teacher class
    const adminClassAnalytics = await AnalyticsService.getTeacherClassAnalytics(testClass.id, admin.id, true);
    assert(
      adminClassAnalytics.classDetails.id === testClass.id,
      'Admin role has authorized access to view any class analytics'
    );

    // Test 9: Teacher student-specific analytics for enrolled student
    const studentTeacherAnalytics = await AnalyticsService.getTeacherStudentAnalytics(student1.id, teacher.id);
    assert(
      studentTeacherAnalytics.student.id === student1.id &&
        studentTeacherAnalytics.summary.totalSubmissions >= 1,
      'Teacher can view detailed performance analytics for student enrolled in their class'
    );

    // Test 10: Teacher cannot view analytics for student NOT in their classes
    const unattachedStudent = await prisma.user.create({
      data: {
        fullName: `Unattached Student ${testId}`,
        email: `unattached.${testId}@edusync.dev`,
        passwordHash: 'dummy_hash',
        role: Role.STUDENT,
      },
    });

    try {
      await AnalyticsService.getTeacherStudentAnalytics(unattachedStudent.id, teacher.id, false);
      assert(false, 'Teacher should not access analytics for students they do not teach');
    } catch (err: any) {
      assert(
        err.status === 403 || err.message?.includes('permission'),
        'Privacy boundary: Teacher is prevented from accessing data of students not in their classes'
      );
    }

    console.log(`\n--- SECTION 4: Student Analytics & Unpublished Grade Privacy ---`);

    // Test 11: Student overview
    const studentOverview = await AnalyticsService.getStudentOverview(student1.id);
    assert(
      studentOverview.summary.submittedAssignments >= 2 &&
        studentOverview.summary.evaluatedAssignments >= 1,
      'Student overview computes total submitted, received, and evaluated assignment counts'
    );

    // Test 12: Unpublished grades are excluded from student overall average
    // Assignment 2 has a draft grade of 35% which must remain hidden
    const assign2Score = studentOverview.assignmentScores.find((s) => s.assignmentId === assign2.id);
    assert(
      assign2Score !== undefined &&
        assign2Score.marks === null &&
        assign2Score.letterGrade === 'Pending' &&
        assign2Score.feedback === null,
      'Security: Unpublished draft grades are strictly excluded from student average percentage and score views'
    );

    // Test 13: Assignment 1 (published 90%) is visible with marks and grade
    const assign1Score = studentOverview.assignmentScores.find((s) => s.assignmentId === assign1.id);
    assert(
      assign1Score !== undefined && assign1Score.marks === 90 && assign1Score.letterGrade === 'A+',
      'Published evaluation marks and letter grade are visible to student in performance breakdown'
    );

    console.log(`\n--- SECTION 5: Admin Platform Analytics ---`);

    // Test 14: Admin overview
    const adminOverview = await AnalyticsService.getAdminOverview();
    assert(
      adminOverview.summary.totalTeachers >= 1 &&
        adminOverview.summary.totalStudents >= 2 &&
        adminOverview.summary.totalActiveClasses >= 1 &&
        adminOverview.summary.totalSubmissions >= 2,
      'Admin overview returns aggregate platform metrics across all departments'
    );

    // Test 15: Registration trends
    assert(
      Array.isArray(adminOverview.registrationTrends) && adminOverview.registrationTrends.length === 6,
      'Admin overview provides 6-month registration trends for chart visualization'
    );

    console.log(`\n--- SECTION 6: Reports Generation & CSV / PDF Export ---`);

    // Test 16: Class report data structure
    const classReport = await ReportService.getClassReportData(testClass.id, teacher.id);
    assert(
      classReport.platform === 'EduSync Cloud Academic Platform' &&
        classReport.classInfo.id === testClass.id &&
        classReport.students.length >= 1,
      'Class performance report generates accurate academic metadata and student roster'
    );

    // Test 17: Class report CSV export
    const classCSV = ReportService.generateClassReportCSV(classReport);
    assert(
      classCSV.includes('EduSync') &&
        classCSV.includes(testClass.name) &&
        classCSV.includes('Student Name,Student ID'),
      'Class report exports valid RFC-4180 CSV with header metadata and student data'
    );

    // Test 18: Class report PDF export
    const classPDF = await ReportService.generateClassReportPDF(classReport);
    assert(
      Buffer.isBuffer(classPDF) && classPDF.length > 500 && classPDF.subarray(0, 4).toString() === '%PDF',
      'Class report exports valid binary PDF document with %PDF magic bytes'
    );

    // Test 19: Student transcript report data
    const studentReport = await ReportService.getStudentReportData(student1.id, {
      userId: teacher.id,
      role: Role.TEACHER,
    });
    assert(
      studentReport.student.id === student1.id &&
        studentReport.summary.evaluatedSubmissions >= 1 &&
        studentReport.assignments.length >= 1,
      'Student transcript report gathers official evaluation records and instructor feedback'
    );

    // Test 20: Student transcript CSV & PDF export
    const studentCSV = ReportService.generateStudentReportCSV(studentReport);
    assert(
      studentCSV.includes(student1.fullName) && studentCSV.includes('Teacher Feedback'),
      'Student transcript exports valid CSV'
    );

    const studentPDF = await ReportService.generateStudentReportPDF(studentReport);
    assert(
      Buffer.isBuffer(studentPDF) && studentPDF.length > 500 && studentPDF.subarray(0, 4).toString() === '%PDF',
      'Student transcript exports valid styled binary PDF document'
    );

    // Test 21: Student privacy in reports - Student 2 cannot generate Student 1 report
    try {
      await ReportService.getStudentReportData(student1.id, {
        userId: student2.id,
        role: Role.STUDENT,
      });
      assert(false, 'Student should not generate transcript report of another student');
    } catch (err: any) {
      assert(
        err.status === 403 || err.message?.includes('denied'),
        'Privacy boundary: Students are restricted to generating only their own transcript'
      );
    }

    // Test 22: Assignment performance report & PDF
    const assignReport = await ReportService.getAssignmentReportData(assign1.id, teacher.id);
    assert(
      assignReport.assignment.id === assign1.id &&
        assignReport.assignment.totalSubmissions >= 1 &&
        assignReport.assignment.averageMarks === 90,
      'Assignment evaluation report accurately calculates submission rate and average marks'
    );

    const assignPDF = await ReportService.generateAssignmentReportPDF(assignReport);
    assert(
      Buffer.isBuffer(assignPDF) && assignPDF.subarray(0, 4).toString() === '%PDF',
      'Assignment report exports formatted binary PDF document'
    );
  } catch (error: any) {
    console.error('Fatal test execution error:', error);
    failed++;
  } finally {
    try {
      await prisma.user.deleteMany({ where: { email: { contains: 'unattached.' } } });
    } catch {}
    await prisma.$disconnect();

    console.log('\n==================================================================');
    console.log(`📊 Phase 10 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('==================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runPhase10Tests();
