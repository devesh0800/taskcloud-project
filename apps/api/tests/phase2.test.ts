import { prisma } from '../src/config/prisma';
import { UserService } from '../src/services/user.service';
import { ClassService } from '../src/services/class.service';
import { AssignmentService } from '../src/services/assignment.service';
import { SubmissionService } from '../src/services/submission.service';
import { GradeService } from '../src/services/grade.service';
import { Role, AssignmentStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

async function runPhase2Tests() {
  console.log('===============================================================');
  console.log('🧪 Starting EduSync Phase 2 Verification & Integrity Test Suite');
  console.log('===============================================================\n');

  const testId = Date.now().toString().slice(-6);
  const passwordHash = await bcrypt.hash('TestPass@123', 8);

  // 1. Connection & Engine Test
  console.log('[Test 1] Verifying Neon Cloud Database Engine...');
  const dbInfo = await prisma.$queryRaw<Array<{ version: string; current_database: string }>>`
    SELECT version(), current_database();
  `;
  if (!dbInfo[0]?.current_database) throw new Error('Database connection check failed.');
  console.log(`  ✓ Connected to Neon DB: ${dbInfo[0].current_database}`);
  console.log(`  ✓ Engine: ${dbInfo[0].version.split(' ')[0]} ${dbInfo[0].version.split(' ')[1]}`);

  // 2. User CRUD
  console.log('\n[Test 2] Testing User Service CRUD...');
  const testTeacher = await UserService.createUser({
    fullName: `Prof. Test ${testId}`,
    email: `teacher_${testId}@test.edusync.dev`,
    passwordHash,
    role: Role.TEACHER,
    teacherId: `TCH-${testId}`,
    department: 'Software Architecture',
  });
  console.log(`  ✓ Teacher created: ${testTeacher.id} (${testTeacher.email})`);

  const testStudent = await UserService.createUser({
    fullName: `Student Test ${testId}`,
    email: `student_${testId}@test.edusync.dev`,
    passwordHash,
    role: Role.STUDENT,
    studentId: `STU-${testId}`,
    course: 'Computer Science',
    semester: '4',
  });
  console.log(`  ✓ Student created: ${testStudent.id} (${testStudent.email})`);

  // 3. Unique Email Constraint Test
  console.log('\n[Test 3] Verifying Unique Email Constraint...');
  try {
    await UserService.createUser({
      fullName: 'Duplicate Email Attempt',
      email: `teacher_${testId}@test.edusync.dev`,
      passwordHash,
      role: Role.TEACHER,
    });
    throw new Error('FAILED: Duplicate email was accepted when it should have failed!');
  } catch (err: any) {
    if (err.code === 'P2002') {
      console.log('  ✓ Unique email constraint successfully enforced (P2002 rejected duplicate)');
    } else {
      throw err;
    }
  }

  // 4. Class Creation & Unique Class Code Test
  console.log('\n[Test 4] Testing Class Service & Auto-Generated Code...');
  const newClass = await ClassService.createClass({
    name: `Database Systems Lab ${testId}`,
    description: 'PostgreSQL Relational Modeling and Query Optimization',
    teacherId: testTeacher.id,
  });
  console.log(`  ✓ Class created: ${newClass.id} with Code: ${newClass.classCode}`);

  // 5. Class Membership & Unique Membership Constraint Test
  console.log('\n[Test 5] Testing Class Membership & Duplicate Prevention...');
  const member = await ClassService.joinClassByCode(newClass.classCode, testStudent.id);
  console.log(`  ✓ Student successfully joined class (Membership ID: ${member.id})`);

  try {
    await ClassService.joinClassByCode(newClass.classCode, testStudent.id);
    throw new Error('FAILED: Student was able to join the same class twice!');
  } catch (err: any) {
    if (err.code === 'P2002') {
      console.log('  ✓ Duplicate class membership successfully prevented (P2002 rejected)');
    } else {
      throw err;
    }
  }

  // 6. Foreign Key Constraint Test
  console.log('\n[Test 6] Verifying Foreign Key Integrity...');
  try {
    await prisma.class.create({
      data: {
        name: 'Invalid Class',
        classCode: `INV${testId}`,
        teacherId: '00000000-0000-0000-0000-000000000000', // Non-existent foreign key
      },
    });
    throw new Error('FAILED: Non-existent foreign key was accepted!');
  } catch (err: any) {
    if (err.code === 'P2003') {
      console.log('  ✓ Foreign key constraint successfully enforced (P2003 rejected invalid teacherId)');
    } else {
      throw err;
    }
  }

  // 7. Assignment Creation & Storage Attachments
  console.log('\n[Test 7] Testing Assignment Service with File Attachment...');
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 5);

  const assignment = await AssignmentService.createAssignment({
    title: `Unit Test Assignment ${testId}`,
    instructions: 'Follow instructions and upload deliverables in PDF format.',
    totalMarks: 100,
    deadline,
    status: AssignmentStatus.PUBLISHED,
    teacherId: testTeacher.id,
    classId: newClass.id,
    attachments: [
      {
        fileName: 'lab_spec.pdf',
        originalName: 'Laboratory_Specification_v1.pdf',
        mimeType: 'application/pdf',
        fileSize: 10240,
        storagePath: 'assignments/lab_spec.pdf',
      },
    ],
  });
  console.log(`  ✓ Assignment published: ${assignment.id} (Marks: ${assignment.totalMarks})`);

  // 8. Student Submission
  console.log('\n[Test 8] Testing Student Submission Service...');
  const submission = await SubmissionService.submitAssignment({
    assignmentId: assignment.id,
    studentId: testStudent.id,
    answerText: 'Solution implemented with connection pooling and ACID compliance.',
    files: [
      {
        fileName: `submission_${testId}.pdf`,
        originalName: 'Student_Final_Report.pdf',
        mimeType: 'application/pdf',
        fileSize: 45000,
        storagePath: `submissions/submission_${testId}.pdf`,
      },
    ],
  });
  console.log(`  ✓ Submission recorded: ${submission.id} (Status: ${submission.status})`);

  // 9. Evaluation & Grading History
  console.log('\n[Test 9] Testing Evaluation & Multi-Record Grading History...');
  const grade1 = await GradeService.recordGrade({
    submissionId: submission.id,
    teacherId: testTeacher.id,
    marks: 85,
    feedback: 'Good work, minor improvements needed in indexing.',
  });
  console.log(`  ✓ Initial evaluation: ${grade1.marks}/100 (Grade: ${grade1.grade})`);

  const grade2 = await GradeService.recordGrade({
    submissionId: submission.id,
    teacherId: testTeacher.id,
    marks: 95,
    feedback: 'Revised work is excellent. All requirements met.',
  });
  console.log(`  ✓ Re-evaluation: ${grade2.marks}/100 (Grade: ${grade2.grade})`);

  const history = await GradeService.getSubmissionGradingHistory(submission.id);
  if (history.length !== 2) throw new Error(`Expected 2 grade records in history, found ${history.length}`);
  console.log(`  ✓ Grading history verified: ${history.length} audit records maintained`);

  // 10. Deletion Protection (onDelete: Restrict)
  console.log('\n[Test 10] Testing Deletion Protection on Academic Records...');
  try {
    await prisma.user.delete({ where: { id: testTeacher.id } });
    throw new Error('FAILED: Teacher with active classes was deleted when Restrict was expected!');
  } catch (err: any) {
    if (
      err.code === 'P2003' ||
      err.message?.includes('RESTRICT') ||
      err.message?.includes('classes_teacherId_fkey')
    ) {
      console.log(
        '  ✓ Deletion protection active: Teacher cannot be deleted while assigned to classes (onDelete: Restrict enforced)'
      );
    } else {
      throw err;
    }
  }

  // Clean up test data safely in reverse order
  console.log('\n[Clean Up] Cleaning temporary test records...');
  await prisma.grade.deleteMany({ where: { submissionId: submission.id } });
  await prisma.submissionFile.deleteMany({ where: { submissionId: submission.id } });
  await prisma.submission.delete({ where: { id: submission.id } });
  await prisma.assignmentAttachment.deleteMany({ where: { assignmentId: assignment.id } });
  await prisma.assignment.delete({ where: { id: assignment.id } });
  await prisma.classMember.deleteMany({ where: { classId: newClass.id } });
  await prisma.class.delete({ where: { id: newClass.id } });
  await prisma.user.delete({ where: { id: testStudent.id } });
  await prisma.user.delete({ where: { id: testTeacher.id } });
  console.log('  ✓ Temporary test entities cleanly removed');

  console.log('\n===============================================================');
  console.log('🎉 ALL 10 PHASE 2 DATABASE & PRISMA TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

runPhase2Tests()
  .catch((err) => {
    console.error('\n❌ Phase 2 Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
