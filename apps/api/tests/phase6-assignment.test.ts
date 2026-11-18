import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });
import fs from 'fs';
import path from 'path';
import { AssignmentService } from '../src/services/assignment.service';
import { ClassService } from '../src/services/class.service';
import { prisma } from '../src/config/prisma';
import { AssignmentStatus, Role } from '@prisma/client';

async function runPhase6Tests() {
  console.log('==================================================================');
  console.log('🧪 Starting EduSync Phase 6: Assignment Management & Publishing Tests');
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
    const teacher = await prisma.user.findUnique({
      where: { email: 'teacher@edusync.dev' },
    });
    const enrolledStudent = await prisma.user.findUnique({
      where: { email: 'alex.rivera@edusync.dev' },
    });
    const nonEnrolledStudent = await prisma.user.findUnique({
      where: { email: 'maya.patel@edusync.dev' },
    });

    if (!teacher || !enrolledStudent || !nonEnrolledStudent) {
      throw new Error('Seeded teacher or students not found.');
    }

    const testId = Date.now().toString().slice(-5);

    // 1. Setup a dedicated class for this test run
    console.log('[Setup] Creating test class and enrolling student...');
    const testClass = await ClassService.createClass({
      name: `Distributed Systems CS-${testId}`,
      description: 'Consensus protocols and Raft algorithms',
      subject: 'Distributed Systems',
      teacherId: teacher.id,
    });
    await ClassService.joinClassByCode(testClass.classCode, enrolledStudent.id);
    assert(testClass.id !== undefined, 'Test class created and student enrolled');

    // Create a dummy attachment file on disk to simulate upload
    const uploadsDir = path.resolve(process.cwd(), 'apps/api/uploads/assignments');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const sampleFileName = `test-ref-${Date.now()}.pdf`;
    const sampleFilePath = path.join(uploadsDir, sampleFileName);
    fs.writeFileSync(sampleFilePath, 'EduSync Assignment Reference Document Content');

    // 2. Teacher creates a draft assignment with attachment
    console.log('\n[Test 1 & 2] Teacher creates draft assignment with attachment...');
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
    const draftAssignment = await AssignmentService.createAssignment({
      title: `Raft Consensus Implementation ${testId}`,
      subject: 'Distributed Systems',
      description: 'Implement a replicated log consensus state machine using Raft.',
      instructions: 'Submit a zip file containing code and PDF report. Late submissions penalised 10%.',
      classId: testClass.id,
      teacherId: teacher.id,
      totalMarks: 100,
      passingMarks: 50,
      startDate: new Date(),
      deadline: deadline,
      allowLateSubmission: true,
      allowResubmission: true,
      maxAttempts: 3,
      status: AssignmentStatus.DRAFT,
      attachments: [
        {
          fileName: sampleFileName,
          originalName: 'raft-spec.pdf',
          mimeType: 'application/pdf',
          fileSize: 44,
          storagePath: sampleFilePath,
        },
      ],
    });

    assert(draftAssignment.id !== undefined, 'Draft assignment created in Neon PostgreSQL');
    assert(draftAssignment.status === AssignmentStatus.DRAFT, 'Assignment status is DRAFT');
    assert(
      draftAssignment.attachments && draftAssignment.attachments.length === 1,
      'Reference attachment linked to assignment'
    );
    assert(draftAssignment.totalMarks === 100, 'Total marks set correctly (100)');
    assert(draftAssignment.passingMarks === 50, 'Passing marks set correctly (50)');
    assert(draftAssignment.allowLateSubmission === true, 'allowLateSubmission flag saved');
    assert(draftAssignment.maxAttempts === 3, 'maxAttempts saved');

    // 3. Draft assignment invisible to enrolled students
    console.log('\n[Test 3 & 4] Student cannot view draft assignments...');
    const studentListDraft = await AssignmentService.listByStudent(enrolledStudent.id);
    const draftInStudentList = studentListDraft.assignments.find((a) => a.id === draftAssignment.id);
    assert(draftInStudentList === undefined, 'Draft assignment does NOT appear in enrolled student list');

    try {
      await AssignmentService.getStudentAssignmentDetails(draftAssignment.id, enrolledStudent.id);
      assert(false, 'Draft assignment details should not be accessible to student');
    } catch (err: any) {
      assert(err.status === 404, 'Draft assignment details return 404 Not Found to student');
    }

    // 4. Teacher views their assignment in teacher list
    console.log('\n[Test 5] Teacher lists assignments...');
    const teacherAssignments = await AssignmentService.listByTeacher(teacher.id, {
      classId: testClass.id,
    });
    const foundTeacherAssoc = teacherAssignments.assignments.find((a) => a.id === draftAssignment.id);
    assert(foundTeacherAssoc !== undefined, 'Draft assignment is visible in teacher assignment list');

    // 5. Teacher updates draft assignment
    console.log('\n[Test 6] Teacher updates assignment...');
    const updatedDraft = await AssignmentService.updateAssignment(
      draftAssignment.id,
      teacher.id,
      {
        totalMarks: 120,
        instructions: 'Updated instructions: Include unit tests with coverage above 80%.',
      }
    );
    assert(updatedDraft.totalMarks === 120, 'Assignment total marks updated to 120');
    assert(
      updatedDraft.instructions.includes('unit tests'),
      'Assignment instructions updated successfully'
    );

    // 6. Teacher publishes assignment
    console.log('\n[Test 7 & 8] Teacher publishes assignment...');
    const publishedAssignment = await AssignmentService.publishAssignment(
      draftAssignment.id,
      teacher.id
    );
    assert(
      publishedAssignment.status === AssignmentStatus.PUBLISHED,
      'Assignment status transitioned to PUBLISHED'
    );
    assert(publishedAssignment.publishedAt !== null, 'Assignment publishedAt timestamp set');

    // 7. Enrolled student now sees the published assignment
    console.log('\n[Test 9 & 10] Enrolled student can view published assignment...');
    const studentAssignments = await AssignmentService.listByStudent(enrolledStudent.id);
    const foundPublished = studentAssignments.assignments.find((a) => a.id === draftAssignment.id);
    assert(foundPublished !== undefined, 'Published assignment now visible to enrolled student');
    assert(foundPublished?.studentStatus === 'PENDING', 'Initial student computed status is PENDING');

    // 8. Notifications created in PostgreSQL for enrolled student
    console.log('\n[Test 11] Notifications generated for enrolled students...');
    const notifications = await prisma.notification.findMany({
      where: {
        userId: enrolledStudent.id,
        type: 'ASSIGNMENT_PUBLISHED',
        message: { contains: draftAssignment.title },
      },
    });
    assert(notifications.length > 0, 'Notification record stored in PostgreSQL for enrolled student');

    // 9. Enrolled student gets full assignment details
    console.log('\n[Test 12] Enrolled student views detailed assignment page...');
    const studentDetails = await AssignmentService.getStudentAssignmentDetails(
      draftAssignment.id,
      enrolledStudent.id
    );
    assert(studentDetails.id === draftAssignment.id, 'Full details returned to student');
    assert(
      studentDetails.attachments.length === 1,
      'Reference attachments visible to student'
    );
    assert(studentDetails.isSubmitted === false, 'Zero submissions initially recorded');

    // 10. Non-enrolled student cannot access assignment details
    console.log('\n[Test 13] Non-enrolled student access is forbidden...');
    try {
      await AssignmentService.getStudentAssignmentDetails(
        draftAssignment.id,
        nonEnrolledStudent.id
      );
      assert(false, 'Non-enrolled student should be rejected');
    } catch (err: any) {
      assert(
        err.status === 403 || err.status === 404,
        `Non-enrolled student denied access with status ${err.status}`
      );
    }

    // 11. Enrolled student downloads reference attachment
    console.log('\n[Test 14] Enrolled student downloads reference attachment...');
    const attachmentId = draftAssignment.attachments[0].id;
    const downloadData = await AssignmentService.getAttachmentForDownload(
      draftAssignment.id,
      attachmentId,
      { userId: enrolledStudent.id, role: Role.STUDENT }
    );
    assert(
      fs.existsSync(downloadData.absolutePath),
      'Attachment file exists in local storage path'
    );
    assert(
      downloadData.originalName === 'raft-spec.pdf',
      'Attachment original filename preserved'
    );

    // 12. Non-enrolled student cannot download reference attachment
    console.log('\n[Test 15] Non-enrolled student cannot download attachment...');
    try {
      await AssignmentService.getAttachmentForDownload(
        draftAssignment.id,
        attachmentId,
        { userId: nonEnrolledStudent.id, role: Role.STUDENT }
      );
      assert(false, 'Non-enrolled student download should fail');
    } catch (err: any) {
      assert(err.status === 403, 'Non-enrolled download rejected with 403 Forbidden');
    }

    // 13. Teacher closes assignment
    console.log('\n[Test 16] Teacher closes assignment...');
    const closedAssignment = await AssignmentService.closeAssignment(
      draftAssignment.id,
      teacher.id
    );
    assert(
      closedAssignment.status === AssignmentStatus.CLOSED,
      'Assignment status successfully changed to CLOSED'
    );

    // 14. Student sees CLOSED status
    console.log('\n[Test 17] Student views closed assignment...');
    const studentListAfterClose = await AssignmentService.listByStudent(enrolledStudent.id, {
      statusFilter: 'CLOSED',
    });
    const foundClosed = studentListAfterClose.assignments.find((a) => a.id === draftAssignment.id);
    assert(foundClosed !== undefined, 'Closed assignment filtered correctly for student');

    // 15. Teacher creates and deletes another draft assignment
    console.log('\n[Test 18] Teacher deletes draft assignment...');
    const tempDraft = await AssignmentService.createAssignment({
      title: `Temp Draft Assignment ${testId}`,
      instructions: 'Temporary test assignment to be deleted',
      classId: testClass.id,
      teacherId: teacher.id,
      totalMarks: 50,
      deadline: new Date(Date.now() + 3600000),
    });
    await AssignmentService.deleteAssignment(tempDraft.id, teacher.id);

    const checkDeleted = await prisma.assignment.findUnique({
      where: { id: tempDraft.id },
    });
    assert(checkDeleted === null, 'Deleted draft assignment completely removed from database');

    // Clean up sample file
    if (fs.existsSync(sampleFilePath)) {
      fs.unlinkSync(sampleFilePath);
    }
  } catch (error: any) {
    console.error('❌ Test execution error:', error);
    failed++;
  } finally {
    console.log('\n===============================================================');
    console.log(`Phase 6 Tests Completed: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runPhase6Tests();
