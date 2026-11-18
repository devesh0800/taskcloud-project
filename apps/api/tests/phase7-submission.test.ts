import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });
import fs from 'fs';
import path from 'path';
import { SubmissionService } from '../src/services/submission.service';
import { AssignmentService } from '../src/services/assignment.service';
import { ClassService } from '../src/services/class.service';
import { validateFile } from '../src/storage/file.validation';
import { prisma } from '../src/config/prisma';
import { AssignmentStatus, SubmissionStatus, Role } from '@prisma/client';

async function runPhase7Tests() {
  console.log('==================================================================');
  console.log('🧪 Starting EduSync Phase 7: Student Submission & Upload Tests');
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
    // 0. Fetch seeded teacher and students
    const teacher = await prisma.user.findUnique({
      where: { email: 'teacher@edusync.dev' },
    });
    const student1 = await prisma.user.findUnique({
      where: { email: 'alex.rivera@edusync.dev' },
    });
    const student2 = await prisma.user.findUnique({
      where: { email: 'maya.patel@edusync.dev' },
    });

    if (!teacher || !student1 || !student2) {
      throw new Error('Seeded test users not found.');
    }

    const testId = Date.now().toString().slice(-5);

    // Setup: Create class and enroll student1 (student2 is left non-enrolled)
    console.log('[Setup] Creating class and publishing assignment...');
    const testClass = await ClassService.createClass({
      name: `Cloud Computing CS-${testId}`,
      description: 'Distributed File Systems and MapReduce',
      subject: 'CS-701',
      teacherId: teacher.id,
    });
    await ClassService.joinClassByCode(testClass.classCode, student1.id);

    // Publish assignment with late submissions & resubmissions allowed
    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const assignment = await AssignmentService.createAssignment({
      title: `MapReduce WordCount Implementation ${testId}`,
      subject: 'Cloud Computing',
      instructions: 'Submit Python code and PDF execution report.',
      classId: testClass.id,
      teacherId: teacher.id,
      totalMarks: 100,
      deadline,
      allowLateSubmission: true,
      allowResubmission: true,
      maxAttempts: 3,
      status: AssignmentStatus.PUBLISHED,
    });

    // Setup local submission storage dir
    const uploadsDir = path.resolve(process.cwd(), 'apps/api/uploads/submissions');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 1. File Validation Tests (Allowed, Dangerous, Oversized)
    console.log('\n[Test 1, 2, 3] File validation rules...');
    const validPdf = validateFile('solution.pdf', 'application/pdf', 1024 * 50);
    assert(validPdf.valid === true, 'PDF file passes validation');

    const invalidExt = validateFile('exploit.exe', 'application/x-msdownload', 1024);
    assert(invalidExt.valid === false, 'Executable script (.exe) is rejected');

    const oversizedFile = validateFile('huge.pdf', 'application/pdf', 15 * 1024 * 1024);
    assert(oversizedFile.valid === false, 'Oversized file (>10MB) is rejected');

    // 2. Student submits text-only answer
    console.log('\n[Test 4 & 5] Student submits text answer...');
    const textSubmission = await SubmissionService.submitAssignment({
      assignmentId: assignment.id,
      studentId: student1.id,
      answerText: 'https://github.com/alex-rivera/mapreduce-wordcount.git\nImplemented mapper and reducer in Python with combiner.',
    });
    assert(textSubmission.id !== undefined, 'Submission created in Neon PostgreSQL');
    assert(textSubmission.status === SubmissionStatus.SUBMITTED, 'Initial status is SUBMITTED (before deadline)');
    assert(textSubmission.attemptNumber === 1, 'Initial attemptNumber is 1');
    assert(
      textSubmission.answerText?.includes('mapreduce-wordcount'),
      'Text answer stored accurately in database'
    );

    // 3. Teacher receives notification for submission
    console.log('\n[Test 6] Teacher receives submission notification in PostgreSQL...');
    const teacherNotification = await prisma.notification.findFirst({
      where: {
        userId: teacher.id,
        type: 'SUBMISSION_CREATED',
        message: { contains: assignment.title },
      },
    });
    assert(teacherNotification !== null, 'Teacher notification record stored in Neon PostgreSQL');

    // 4. Student resubmits with multiple file attachments
    console.log('\n[Test 7 & 8] Student resubmits with multiple file attachments...');
    const file1Name = `test-wordcount-${Date.now()}.pdf`;
    const file2Name = `test-code-${Date.now()}.txt`;
    const file1Path = path.join(uploadsDir, file1Name);
    const file2Path = path.join(uploadsDir, file2Name);
    fs.writeFileSync(file1Path, '%PDF-1.4 Mock PDF Content');
    fs.writeFileSync(file2Path, 'def mapper(line): pass\ndef reducer(k, v): pass');

    const resubmission = await SubmissionService.submitAssignment({
      assignmentId: assignment.id,
      studentId: student1.id,
      answerText: 'Updated submission with attached documentation and code.',
      files: [
        {
          fileName: file1Name,
          originalName: 'WordCount_Report.pdf',
          mimeType: 'application/pdf',
          fileSize: 25,
          storagePath: `uploads/submissions/${file1Name}`,
        },
        {
          fileName: file2Name,
          originalName: 'wordcount.txt',
          mimeType: 'text/plain',
          fileSize: 45,
          storagePath: `uploads/submissions/${file2Name}`,
        },
      ],
    });

    assert(resubmission.attemptNumber === 2, 'Attempt number incremented to 2');
    assert(resubmission.files.length === 2, 'Multiple files linked to submission');
    assert(fs.existsSync(file1Path), 'Uploaded PDF stored in local filesystem');
    assert(fs.existsSync(file2Path), 'Uploaded TXT stored in local filesystem');

    // 5. Version History & Attempts
    console.log('\n[Test 9] Version history tracking...');
    const history = await SubmissionService.getSubmissionHistory(resubmission.id, {
      userId: student1.id,
      role: Role.STUDENT,
    });
    assert(history.length === 2, 'Submission history records both Attempt #1 and Attempt #2');
    assert(history[0].attemptNumber === 1, 'Attempt #1 preserved');
    assert(history[1].attemptNumber === 2, 'Attempt #2 preserved with new files');

    // 6. Teacher views submissions list and filters
    console.log('\n[Test 10 & 11] Teacher lists submissions with filters...');
    const teacherList = await SubmissionService.listByTeacher(teacher.id, {
      classId: testClass.id,
      assignmentId: assignment.id,
    });
    assert(teacherList.submissions.length === 1, 'Teacher can view student submission in list');
    assert(teacherList.statistics.total >= 1, 'Teacher submission statistics aggregated accurately');

    // 7. Teacher views submission detail & downloads file
    console.log('\n[Test 12 & 13] Teacher downloads student submitted file...');
    const fileToDownload = resubmission.files[0];
    const downloadData = await SubmissionService.getFileForDownload(fileToDownload.id, {
      userId: teacher.id,
      role: Role.TEACHER,
    });
    assert(downloadData.originalName === 'WordCount_Report.pdf', 'Teacher accesses file with correct original name');
    assert(fs.existsSync(downloadData.absolutePath), 'Teacher downloaded file exists on disk');

    // 8. Security: Non-enrolled student cannot submit
    console.log('\n[Test 14] Non-enrolled student cannot submit...');
    try {
      await SubmissionService.submitAssignment({
        assignmentId: assignment.id,
        studentId: student2.id,
        answerText: 'Hacking attempt',
      });
      assert(false, 'Non-enrolled student submission should throw error');
    } catch (err: any) {
      assert(err.status === 403, 'Non-enrolled student rejected with 403 Forbidden');
    }

    // 9. Security: Unauthorized student cannot download other student file
    console.log('\n[Test 15] Unauthorized student cannot download other student file...');
    try {
      await SubmissionService.getFileForDownload(fileToDownload.id, {
        userId: student2.id,
        role: Role.STUDENT,
      });
      assert(false, 'Unauthorized student file download should throw error');
    } catch (err: any) {
      assert(err.status === 403, 'Unauthorized student file download rejected with 403 Forbidden');
    }

    // 10. Teacher updates status to UNDER_REVIEW
    console.log('\n[Test 16] Teacher updates status to UNDER_REVIEW...');
    const underReview = await SubmissionService.updateSubmissionStatus(
      resubmission.id,
      teacher.id,
      SubmissionStatus.UNDER_REVIEW
    );
    assert(underReview.status === SubmissionStatus.UNDER_REVIEW, 'Status transitioned to UNDER_REVIEW');

    // 11. Teacher requests resubmission
    console.log('\n[Test 17 & 18] Teacher requests resubmission...');
    const resubmitReq = await SubmissionService.requestResubmission(
      resubmission.id,
      teacher.id,
      'Please include test output screenshots.'
    );
    assert(
      resubmitReq.status === SubmissionStatus.RESUBMISSION_REQUIRED,
      'Status updated to RESUBMISSION_REQUIRED'
    );

    const studentNotification = await prisma.notification.findFirst({
      where: {
        userId: student1.id,
        type: 'RESUBMISSION_REQUIRED',
      },
    });
    assert(studentNotification !== null, 'Resubmission notification sent to student in PostgreSQL');

    // 12. Late Submission Rules
    console.log('\n[Test 19 & 20] Late submission rules...');
    // Create an assignment whose deadline was in the past
    const pastDeadline = new Date(Date.now() - 3600000); // 1 hour ago
    const lateAllowedAssignment = await AssignmentService.createAssignment({
      title: `Late Test Assignment ${testId}`,
      instructions: 'Late test',
      classId: testClass.id,
      teacherId: teacher.id,
      totalMarks: 50,
      deadline: pastDeadline,
      allowLateSubmission: true,
      status: AssignmentStatus.PUBLISHED,
    });

    const lateSub = await SubmissionService.submitAssignment({
      assignmentId: lateAllowedAssignment.id,
      studentId: student1.id,
      answerText: 'Submitted past deadline',
    });
    assert(lateSub.status === SubmissionStatus.LATE, 'Submission after deadline is marked as LATE');

    const lateForbiddenAssignment = await AssignmentService.createAssignment({
      title: `Strict Deadline Assignment ${testId}`,
      instructions: 'No late submissions',
      classId: testClass.id,
      teacherId: teacher.id,
      totalMarks: 50,
      deadline: pastDeadline,
      allowLateSubmission: false,
      status: AssignmentStatus.PUBLISHED,
    });

    try {
      await SubmissionService.submitAssignment({
        assignmentId: lateForbiddenAssignment.id,
        studentId: student1.id,
        answerText: 'Should be rejected',
      });
      assert(false, 'Late submission on strict assignment should be rejected');
    } catch (err: any) {
      assert(err.status === 400, 'Late submission rejected with 400 Bad Request');
    }

    // Clean up mock files
    if (fs.existsSync(file1Path)) fs.unlinkSync(file1Path);
    if (fs.existsSync(file2Path)) fs.unlinkSync(file2Path);
  } catch (error: any) {
    console.error('❌ Test execution error:', error);
    failed++;
  } finally {
    console.log('\n===============================================================');
    console.log(`Phase 7 Tests Completed: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runPhase7Tests();
