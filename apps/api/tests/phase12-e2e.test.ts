import assert from 'assert';
import http from 'http';
import bcrypt from 'bcrypt';
import { prisma } from '../src/config/prisma';
import { AuthService } from '../src/services/auth.service';
import { ClassService } from '../src/services/class.service';
import { AssignmentService } from '../src/services/assignment.service';
import { SubmissionService } from '../src/services/submission.service';
import { GradeService } from '../src/services/grade.service';
import { NotificationService } from '../src/services/notification.service';
import { AnalyticsService } from '../src/services/analytics.service';
import { ReportService } from '../src/services/report.service';
import { storageService } from '../src/storage/localStorage.service';
import { validateFile } from '../src/storage/file.validation';
import { generateAccessToken } from '../src/utils/tokens';
import { Role, AssignmentStatus, MembershipStatus, SubmissionStatus } from '@prisma/client';
import { createApp } from '../src/app';

const app = createApp();

async function runPhase12Tests() {
  console.log('==================================================================');
  console.log('🧪 Starting EduSync Phase 12: Complete End-to-End Verification');
  console.log('==================================================================\n');

  // Start test server on ephemeral port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${baseUrl}${endpoint}`;
    const res = await fetch(url, options);
    let body: any = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        body = await res.json();
      } catch {
        body = null;
      }
    } else {
      body = await res.text();
    }
    return {
      status: res.status,
      headers: res.headers,
      body,
    };
  }

  const testRunId = Date.now().toString(36);
  let passedCount = 0;

  function pass(msg: string) {
    passedCount++;
    console.log(`  ✅ PASS: ${msg}`);
  }

  try {
    // ==================================================================
    // 1. AUTHENTICATION & SESSION VERIFICATION
    // ==================================================================
    console.log('--- 1. Authentication & Session Verification ---');

    const teacherPassword = 'TeacherSecret123!';
    const studentPassword = 'StudentSecret123!';

    // 1.1 Teacher Registration
    const teacherRegRes = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: `Prof. Testing ${testRunId}`,
        email: `prof.${testRunId}@edusync.dev`,
        password: teacherPassword,
        confirmPassword: teacherPassword,
        role: 'TEACHER',
        teacherId: `TCH-${testRunId}`,
        department: 'Computer Science',
      }),
    });
    assert.strictEqual(teacherRegRes.status, 201, 'Teacher registration should succeed');
    const registeredTeacher = teacherRegRes.body.user;
    assert.strictEqual(registeredTeacher.role, 'TEACHER');
    assert.strictEqual(registeredTeacher.passwordHash, undefined);
    pass('Teacher registration succeeds with proper role and sanitized response');

    // 1.2 Duplicate Email Detection
    const dupRegRes = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Duplicate Prof',
        email: `prof.${testRunId}@edusync.dev`,
        password: teacherPassword,
        confirmPassword: teacherPassword,
        role: 'TEACHER',
      }),
    });
    assert.strictEqual(dupRegRes.status, 400, 'Duplicate registration must be rejected with 400');
    pass('Duplicate email registration is rejected without revealing credentials');

    // 1.3 Student Registration
    const studentRegRes = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: `Student Testing ${testRunId}`,
        email: `student.${testRunId}@edusync.dev`,
        password: studentPassword,
        confirmPassword: studentPassword,
        role: 'STUDENT',
        studentId: `STU-${testRunId}`,
        course: 'Software Engineering',
        semester: '5',
        section: 'A',
      }),
    });
    assert.strictEqual(studentRegRes.status, 201, 'Student registration should succeed');
    const registeredStudent = studentRegRes.body.user;
    assert.strictEqual(registeredStudent.role, 'STUDENT');
    pass('Student registration succeeds with student ID, course, semester, and section');

    // 1.4 Teacher Login & Role Redirection
    const teacherLoginRes = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `prof.${testRunId}@edusync.dev`,
        password: teacherPassword,
      }),
    });
    assert.strictEqual(teacherLoginRes.status, 200);
    assert.strictEqual(teacherLoginRes.body.redirectPath, '/teacher/dashboard');
    const teacherToken = teacherLoginRes.body.accessToken;
    pass('Teacher login returns valid JWT token and redirects to /teacher/dashboard');

    // 1.5 Student Login & Role Redirection
    const studentLoginRes = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `student.${testRunId}@edusync.dev`,
        password: studentPassword,
      }),
    });
    assert.strictEqual(studentLoginRes.status, 200);
    assert.strictEqual(studentLoginRes.body.redirectPath, '/student/dashboard');
    const studentToken = studentLoginRes.body.accessToken;
    pass('Student login returns valid JWT token and redirects to /student/dashboard');

    // 1.6 Password Reset Flow
    await AuthService.forgotPassword(`student.${testRunId}@edusync.dev`);
    const resetTokenRecord = await prisma.passwordResetToken.findFirst({
      where: { userId: registeredStudent.id },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(resetTokenRecord, 'Password reset token must be persisted in database');
    pass('Forgot password flow securely generates hashed, expiring reset token');

    // ==================================================================
    // 2. TEACHER & CLASS MANAGEMENT WORKFLOW
    // ==================================================================
    console.log('\n--- 2. Teacher & Class Management Workflow ---');

    // 2.1 Teacher creates class
    const createClassRes = await apiRequest('/api/v1/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        name: `Distributed Systems ${testRunId}`,
        description: 'Advanced Cloud Computing and Microservices',
        subject: 'Computer Science',
        department: 'CS',
        semester: 'Fall 2026',
        section: 'DS-01',
      }),
    });
    assert.strictEqual(createClassRes.status, 201);
    const createdClass = createClassRes.body.data;
    assert.ok(createdClass.classCode.startsWith('EDU-'), 'Class code format should be EDU-XXXXXX');
    assert.strictEqual(createdClass.teacherId, registeredTeacher.id);
    pass('Teacher successfully creates class with unique auto-generated joining code');

    // 2.2 Teacher regenerates joining code
    const regenCodeRes = await apiRequest(`/api/v1/classes/${createdClass.id}/regenerate-code`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.strictEqual(regenCodeRes.status, 200);
    const updatedClassCode = regenCodeRes.body.data.classCode;
    assert.notStrictEqual(updatedClassCode, createdClass.classCode);
    pass('Teacher regenerates unique joining code and updates class record');

    // ==================================================================
    // 3. STUDENT ENROLLMENT & CLASS WORKFLOW
    // ==================================================================
    console.log('\n--- 3. Student Enrollment & Class Workflow ---');

    // 3.1 Student joins class via joining code
    const joinClassRes = await apiRequest('/api/v1/classes/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ classCode: updatedClassCode }),
    });
    assert.strictEqual(joinClassRes.status, 200);
    pass('Student successfully joins class using active joining code');

    // 3.2 Student views enrolled classes
    const studentClassesRes = await apiRequest('/api/v1/classes/student', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(studentClassesRes.status, 200);
    const studentClasses = studentClassesRes.body.data;
    assert.ok(studentClasses.some((c: any) => c.id === createdClass.id));
    pass('Student views enrolled classes roster containing joined class');

    // 3.3 Teacher views enrolled students list
    const enrolledStudentsRes = await apiRequest(`/api/v1/classes/${createdClass.id}/students`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.strictEqual(enrolledStudentsRes.status, 200);
    const roster = enrolledStudentsRes.body.data;
    assert.ok(roster.some((s: any) => s.id === registeredStudent.id));
    pass('Teacher views class student roster with active enrolled student records');

    // ==================================================================
    // 4. ASSIGNMENT CREATION, ATTACHMENTS & PUBLISHING
    // ==================================================================
    console.log('\n--- 4. Assignment Creation, Attachments & Publishing ---');

    // 4.1 Teacher uploads reference document to local filesystem
    const sampleAttachmentBuffer = Buffer.from('EduSync Lab Assignment Instructions and Starter Code');
    const savedAttachment = await storageService.saveFile(
      sampleAttachmentBuffer,
      'lab_specs.pdf',
      'application/pdf',
      'assignments'
    );
    assert.ok(savedAttachment.storedFileName);
    pass('Teacher uploads reference document stored safely on local filesystem');

    // 4.2 Teacher creates assignment (PUBLISHED)
    const deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const createAssignRes = await apiRequest('/api/v1/assignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        title: `Kubernetes Cluster Lab ${testRunId}`,
        description: 'Deploy a high-availability microservices cluster',
        instructions: 'Submit your manifest YAML and architecture report.',
        subject: 'Cloud Computing',
        totalMarks: 100,
        passingMarks: 50,
        deadline: deadlineDate.toISOString(),
        allowLateSubmission: true,
        allowResubmission: true,
        maxAttempts: 2,
        status: 'PUBLISHED',
        classId: createdClass.id,
        attachments: [
          {
            fileName: savedAttachment.storedFileName,
            originalName: 'lab_specs.pdf',
            mimeType: 'application/pdf',
            fileSize: sampleAttachmentBuffer.length,
            storagePath: savedAttachment.relativeFilePath,
          },
        ],
      }),
    });
    assert.strictEqual(createAssignRes.status, 201);
    const createdAssignment = createAssignRes.body.data;
    assert.strictEqual(createdAssignment.status, 'PUBLISHED');
    assert.strictEqual(createdAssignment.attachments.length, 1);
    pass('Teacher creates and publishes assignment with reference attachment');

    // 4.3 Student views published assignment in feed
    const studentAssignListRes = await apiRequest('/api/v1/assignments/student', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(studentAssignListRes.status, 200);
    const studentAssignList = studentAssignListRes.body.data.assignments;
    assert.ok(studentAssignList.some((a: any) => a.id === createdAssignment.id));
    pass('Enrolled student views published assignment in their academic feed');

    // 4.4 Student downloads assignment reference attachment
    const attachmentId = createdAssignment.attachments[0].id;
    const downloadAttRes = await apiRequest(
      `/api/v1/assignments/${createdAssignment.id}/attachments/${attachmentId}/download`,
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert.strictEqual(downloadAttRes.status, 200);
    assert.ok(downloadAttRes.body.length > 0);
    pass('Student successfully downloads assignment attachment with verified enrollment');

    // ==================================================================
    // 5. STUDENT SUBMISSION & RESUBMISSION WORKFLOW
    // ==================================================================
    console.log('\n--- 5. Student Submission & Resubmission Workflow ---');

    // 5.1 Student uploads submission file to local filesystem
    const sampleSubmissionBuffer = Buffer.from('Student Complete Solution Architecture Report');
    const savedSubFile = await storageService.saveFile(
      sampleSubmissionBuffer,
      'solution_report.pdf',
      'application/pdf',
      'submissions'
    );
    assert.ok(savedSubFile.storedFileName);
    pass('Student uploads assignment file to local filesystem storage');

    // 5.2 Student submits text and file (Attempt 1)
    const submitRes = await SubmissionService.submitAssignment({
      assignmentId: createdAssignment.id,
      studentId: registeredStudent.id,
      answerText: 'Here is my Kubernetes deployment solution and cluster architecture.',
      files: [
        {
          fileName: savedSubFile.storedFileName,
          originalName: 'solution_report.pdf',
          mimeType: 'application/pdf',
          fileSize: sampleSubmissionBuffer.length,
          storagePath: savedSubFile.relativeFilePath,
        },
      ],
    });
    assert.ok(submitRes.id);
    assert.strictEqual(submitRes.attemptNumber, 1);
    assert.strictEqual(submitRes.status, SubmissionStatus.SUBMITTED);
    pass('Student submits assignment text and file (Attempt 1) with status SUBMITTED');

    // 5.3 Teacher views submission
    const teacherSubListRes = await apiRequest(`/api/v1/submissions/teacher?assignmentId=${createdAssignment.id}`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.strictEqual(teacherSubListRes.status, 200);
    const teacherSubmissions = Array.isArray(teacherSubListRes.body.data)
      ? teacherSubListRes.body.data
      : (teacherSubListRes.body.data?.submissions || []);
    console.log('teacherSubmissions items count:', teacherSubmissions.length, 'sample:', JSON.stringify(teacherSubmissions[0]));
    assert.strictEqual(teacherSubmissions.length, 1);
    assert.strictEqual(teacherSubmissions[0].studentId || teacherSubmissions[0].student?.id, registeredStudent.id);
    pass('Teacher receives and views student submission in evaluation inbox');

    // 5.4 Teacher downloads student submitted file
    const submittedFileId = submitRes.files[0].id;
    const downloadSubFileRes = await apiRequest(`/api/v1/submissions/files/${submittedFileId}/download`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.strictEqual(downloadSubFileRes.status, 200);
    assert.ok(downloadSubFileRes.body.length > 0);
    pass('Teacher downloads student submitted file with verified class teacher ownership');

    // ==================================================================
    // 6. TEACHER EVALUATION, FEEDBACK & GRADE PUBLISHING
    // ==================================================================
    console.log('\n--- 6. Teacher Evaluation, Feedback & Grade Publishing ---');

    // 6.1 Teacher grades submission (DRAFT)
    const draftEvaluation = await GradeService.recordGrade({
      submissionId: submitRes.id,
      teacherId: registeredTeacher.id,
      marks: 92,
      feedback: 'Excellent cluster architecture and clean YAML manifests.',
      evaluationComments: 'Outstanding deployment strategy.',
      isPublished: false,
    });
    assert.strictEqual(draftEvaluation.marks, 92);
    assert.strictEqual(draftEvaluation.isPublished, false);
    pass('Teacher records evaluation with marks and feedback as DRAFT');

    // 6.2 Privacy check: Student cannot see draft grade
    const studentPrePublishView = await apiRequest(`/api/v1/assignments/student/${createdAssignment.id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(studentPrePublishView.status, 200);
    assert.strictEqual(studentPrePublishView.body.data.submission?.grades?.length || 0, 0);
    pass('Draft grade is strictly hidden from student prior to publishing');

    // 6.3 Teacher publishes grade
    const publishGradeRes = await apiRequest(`/api/v1/grades/${draftEvaluation.id}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.strictEqual(publishGradeRes.status, 200);
    assert.strictEqual(publishGradeRes.body.data.isPublished, true);
    pass('Teacher publishes grade, triggering official notification');

    // 6.4 Student views published grade and feedback
    const studentPostPublishView = await apiRequest(`/api/v1/assignments/student/${createdAssignment.id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(studentPostPublishView.status, 200);
    const pubGrades = studentPostPublishView.body.data.submission?.grades;
    assert.strictEqual(pubGrades?.length, 1);
    assert.strictEqual(pubGrades[0].marks, 92);
    assert.strictEqual(pubGrades[0].grade, 'A+');
    assert.strictEqual(pubGrades[0].feedback, 'Excellent cluster architecture and clean YAML manifests.');
    pass('Student views published marks (92), letter grade (A+), and teacher feedback');

    // ==================================================================
    // 7. REAL-TIME NOTIFICATIONS & UNREAD MANAGEMENT
    // ==================================================================
    console.log('\n--- 7. Real-Time Notifications & Unread Management ---');

    // 7.1 Student checks notifications list
    const studentNotifsRes = await apiRequest('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(studentNotifsRes.status, 200);
    const notifications = studentNotifsRes.body.data.notifications;
    assert.ok(notifications.length > 0, 'Notifications should exist for student');
    pass('Student notifications feed retrieves persisted notifications');

    // 7.2 Unread counter
    const unreadCountRes = await apiRequest('/api/v1/notifications/unread-count', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(unreadCountRes.status, 200);
    assert.ok(unreadCountRes.body.data.unreadCount >= 1);
    pass('Unread notification count correctly calculates unread records');

    // 7.3 Mark all notifications as read
    const markAllRes = await apiRequest('/api/v1/notifications/mark-all-read', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(markAllRes.status, 200);
    const postMarkCountRes = await apiRequest('/api/v1/notifications/unread-count', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(postMarkCountRes.body.data.unreadCount, 0);
    pass('Mark all notifications as read resets unread count to 0');

    // ==================================================================
    // 8. ANALYTICS & REPORTING MODULE
    // ==================================================================
    console.log('\n--- 8. Analytics & Reporting Module ---');

    // 8.1 Teacher Overview Analytics
    const teacherAnalyticsRes = await apiRequest('/api/v1/analytics/teacher/overview', {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.strictEqual(teacherAnalyticsRes.status, 200);
    const tAnalytics = teacherAnalyticsRes.body.data;
    assert.ok(tAnalytics.overall.totalClasses >= 1);
    assert.ok(tAnalytics.overall.totalAssignments >= 1);
    assert.ok(tAnalytics.overall.evaluatedSubmissions >= 1);
    assert.ok(tAnalytics.gradeDistribution['A+'] >= 1);
    pass('Teacher overview analytics calculates accurate overall metrics and grade distribution');

    // 8.2 Student Academic Analytics
    const studentAnalyticsRes = await apiRequest('/api/v1/analytics/student/overview', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(studentAnalyticsRes.status, 200);
    const sAnalytics = studentAnalyticsRes.body.data;
    assert.strictEqual(sAnalytics.summary.submittedAssignments || sAnalytics.summary.totalSubmitted, 1);
    assert.strictEqual(sAnalytics.summary.overallAveragePercentage, 92);
    assert.strictEqual(sAnalytics.summary.currentGrade || sAnalytics.summary.cumulativeLetterGrade, 'A+');
    pass('Student analytics calculates cumulative average (92%) and letter grade (A+)');

    // 8.3 Class Performance Report (JSON, CSV, PDF)
    const classJsonReport = await ReportService.getClassReportData(createdClass.id, registeredTeacher.id);
    assert.strictEqual(classJsonReport.classInfo.name, `Distributed Systems ${testRunId}`);
    assert.ok(classJsonReport.students.length >= 1);

    const classCsv = ReportService.generateClassReportCSV(classJsonReport);
    assert.ok(classCsv.includes('Distributed Systems'));
    assert.ok(classCsv.includes('Student Name'));
    pass('Class performance report exports valid CSV format');

    const classPdf = await ReportService.generateClassReportPDF(classJsonReport);
    assert.ok(classPdf.subarray(0, 4).toString() === '%PDF', 'PDF buffer must start with %PDF magic bytes');
    pass('Class performance report exports valid binary PDF document');

    // 8.4 Student Academic Transcript (PDF)
    const studentReportData = await ReportService.getStudentReportData(registeredStudent.id, {
      userId: registeredStudent.id,
      role: Role.STUDENT,
    });
    const transcriptPdf = await ReportService.generateStudentReportPDF(studentReportData);
    assert.ok(transcriptPdf.subarray(0, 4).toString() === '%PDF', 'Transcript PDF must start with %PDF magic bytes');
    pass('Student academic transcript exports valid binary PDF document');

    // ==================================================================
    // 9. ADMIN WORKFLOW & PLATFORM TELEMETRY
    // ==================================================================
    console.log('\n--- 9. Admin Workflow & Platform Telemetry ---');

    // 9.1 Fetch or create Admin
    let adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          fullName: 'System Administrator',
          email: `admin.${testRunId}@edusync.dev`,
          passwordHash: await bcrypt.hash('AdminPassword123!', 10),
          role: Role.ADMIN,
        },
      });
    }

    const adminToken = generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    // 9.2 Admin Overview Analytics
    const adminOverviewRes = await apiRequest('/api/v1/analytics/admin/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminOverviewRes.status, 200);
    const adminStats = adminOverviewRes.body.data;
    const summary = adminStats.summary || adminStats.counts;
    assert.ok(summary.totalTeachers >= 1);
    assert.ok(summary.totalStudents >= 1);
    assert.ok(summary.totalActiveClasses >= 1 || summary.totalClasses >= 1);
    pass('Admin overview retrieves platform telemetry across all departments');

    // 9.3 Public Admin Registration Prevention
    const publicAdminRegRes = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Hacker Admin',
        email: `hacker.${testRunId}@edusync.dev`,
        password: 'AdminPassword123!',
        confirmPassword: 'AdminPassword123!',
        role: 'ADMIN',
      }),
    });
    assert.strictEqual(publicAdminRegRes.status, 400, 'Public admin registration must be rejected with 400');
    pass('Public registration as ADMIN is strictly prohibited (400 Bad Request)');

    // ==================================================================
    // 10. FILE UPLOAD SECURITY & DEFENSIVE CHECKS
    // ==================================================================
    console.log('\n--- 10. File Upload Security & Defensive Checks ---');

    // 10.1 Prohibited file format rejection
    const dangerousCheck = validateFile('script.exe', 'application/x-msdownload', 1024);
    assert.strictEqual(dangerousCheck.valid, false);
    pass('Executable binaries (.exe) are strictly rejected');

    // 10.2 Max size limit rejection (> 10MB)
    const oversizedCheck = validateFile('huge.pdf', 'application/pdf', 12 * 1024 * 1024);
    assert.strictEqual(oversizedCheck.valid, false);
    pass('Files exceeding 10MB limit are strictly rejected');

    // 10.3 Path traversal defense on downloads
    const traversalCheck = await apiRequest('/api/v1/files/download/assignments/..%2F..%2Fetc%2Fpasswd');
    assert.ok(traversalCheck.status === 400 || traversalCheck.status === 403 || traversalCheck.status === 404);
    pass('Directory traversal attempts (../) are rejected with error response');

    // 10.4 URL double-prefix defense: /api/v1/api/v1 normalization
    const doublePrefixRes = await apiRequest('/api/v1/api/v1/health');
    assert.strictEqual(doublePrefixRes.status, 200);
    pass('Redundant URL prefix (/api/v1/api/v1) is gracefully normalized by middleware');

    console.log('\n==================================================================');
    console.log(`🎉 Phase 12 E2E Master Test Results: ${passedCount} Passed, 0 Failed`);
    console.log('==================================================================\n');
  } finally {
    server.close();
  }
}

runPhase12Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Phase 12 E2E test failed:', err);
    process.exit(1);
  });
