import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });
import { ClassService } from '../src/services/class.service';
import { prisma } from '../src/config/prisma';
import { MembershipStatus, Role } from '@prisma/client';

async function runPhase5Tests() {
  console.log('===============================================================');
  console.log('🧪 Starting EduSync Phase 5: Class Management & Enrollment Tests');
  console.log('===============================================================\n');

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
    // 0. Fetch seeded teacher and student
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
      throw new Error('Seeded teacher or students not found.');
    }

    const testId = Date.now().toString().slice(-5);

    // 1. Teacher creates a class
    console.log('[Test 1 & 2] Teacher creates class & unique code generation...');
    const createdClass = await ClassService.createClass({
      name: `Advanced Operating Systems ${testId}`,
      description: 'Concurrency, memory virtualisation and distributed kernels.',
      subject: 'CS-502',
      department: 'Computer Science',
      semester: '5th Semester',
      section: 'Section B',
      academicYear: '2026-2027',
      teacherId: teacher.id,
    });

    assert(createdClass.id !== undefined, 'Class successfully created in Neon PostgreSQL');
    assert(createdClass.teacherId === teacher.id, 'Class is properly associated with authenticated teacher');
    assert(
      createdClass.classCode.startsWith('EDU-') && createdClass.classCode.length === 10,
      `Joining code generated with format EDU-XXXXXX (${createdClass.classCode})`
    );

    // 2. Teacher views their classes
    console.log('\n[Test 3] Teacher views classes list...');
    const teacherClasses = await ClassService.listByTeacher(teacher.id);
    const found = teacherClasses.find((c) => c.id === createdClass.id);
    assert(found !== undefined, 'Created class appears in teacher class list');

    // 3. Teacher edits class details
    console.log('\n[Test 4] Teacher edits class details...');
    const updatedClass = await ClassService.updateClass(createdClass.id, teacher.id, {
      description: 'Updated kernel research syllabus.',
      section: 'Section Honors',
    });
    assert(
      updatedClass.description === 'Updated kernel research syllabus.' && updatedClass.section === 'Section Honors',
      'Class details updated successfully'
    );

    // 4. Student joins using valid code
    console.log('\n[Test 5] Student joins using valid class code...');
    const joinResult = await ClassService.joinClassByCode(createdClass.classCode, student1.id);
    assert(joinResult.class.id === createdClass.id, 'Student successfully enrolled in target class');
    assert(joinResult.membership.status === MembershipStatus.ACTIVE, 'Student membership status is ACTIVE');

    // 5. Student joins using invalid code
    console.log('\n[Test 6] Student joins using invalid code...');
    try {
      await ClassService.joinClassByCode('EDU-INVALID99', student2.id);
      assert(false, 'Invalid code should throw error');
    } catch (err: any) {
      assert(err.status === 404, 'Invalid code throws 404 Class Not Found');
    }

    // 6. Duplicate enrollment is rejected
    console.log('\n[Test 7] Duplicate enrollment is rejected...');
    try {
      await ClassService.joinClassByCode(createdClass.classCode, student1.id);
      assert(false, 'Duplicate enrollment should throw error');
    } catch (err: any) {
      assert(err.status === 409, 'Duplicate enrollment throws 409 Conflict');
    }

    // 7. Teacher sees enrolled student in roster
    console.log('\n[Test 8] Teacher sees enrolled student in roster...');
    const enrolledStudents = await ClassService.getEnrolledStudents(createdClass.id, teacher.id);
    const enrolledAlex = enrolledStudents.find((s) => s.id === student1.id);
    assert(enrolledAlex !== undefined, 'Enrolled student visible in teacher roster');
    assert(enrolledAlex?.email === student1.email, 'Student details match enrolled user');

    // 8. Teacher removes a student
    console.log('\n[Test 9 & 10] Teacher removes student & access revocation...');
    const removedMember = await ClassService.removeStudent(createdClass.id, student1.id, teacher.id);
    assert(removedMember.status === MembershipStatus.REMOVED, 'Membership status transitioned to REMOVED');
    assert(removedMember.removedAt !== null, 'Removal timestamp properly recorded');

    // Student 1 should no longer see the class in their active classes
    const studentActiveClasses = await ClassService.listByStudent(student1.id);
    const stillActive = studentActiveClasses.find((c) => c.id === createdClass.id);
    assert(stillActive === undefined, 'Removed student no longer sees class in active courses');

    // 9. Historical records preserved
    console.log('\n[Test 11] Historical enrollment record preservation...');
    const membershipInDb = await prisma.classMember.findUnique({
      where: {
        classId_studentId: {
          classId: createdClass.id,
          studentId: student1.id,
        },
      },
    });
    assert(membershipInDb !== null, 'Membership record was NOT hard deleted from database');
    assert(membershipInDb?.status === MembershipStatus.REMOVED, 'Historical record retained with status REMOVED');

    // 10. Class code regeneration works & old code fails
    console.log('\n[Test 12] Class code regeneration & old code invalidation...');
    const oldCode = createdClass.classCode;
    const regenResult = await ClassService.regenerateCode(createdClass.id, teacher.id);
    assert(regenResult.classCode !== oldCode, `New code generated (${regenResult.classCode}) differs from old code`);

    // Attempt to join with old code should fail
    try {
      await ClassService.joinClassByCode(oldCode, student2.id);
      assert(false, 'Old code should no longer work');
    } catch (err: any) {
      assert(err.status === 404, 'Old code successfully invalidated (throws 404)');
    }

    // Student 2 can join with new regenerated code
    const student2Join = await ClassService.joinClassByCode(regenResult.classCode, student2.id);
    assert(student2Join.class.id === createdClass.id, 'Student 2 enrolled using new regenerated code');

    // 11. Unauthorized access & security checks
    console.log('\n[Test 13] Unauthorized access checks...');
    const fakeTeacherId = '00000000-0000-0000-0000-000000000000';
    try {
      await ClassService.updateClass(createdClass.id, fakeTeacherId, { name: 'Hacked Class' });
      assert(false, 'Unauthorized teacher should not update class');
    } catch (err: any) {
      assert(err.status === 403, 'Unauthorized modification blocked with 403 Forbidden');
    }

    try {
      await ClassService.removeStudent(createdClass.id, student2.id, fakeTeacherId);
      assert(false, 'Unauthorized teacher should not remove student');
    } catch (err: any) {
      assert(err.status === 403, 'Unauthorized student removal blocked with 403 Forbidden');
    }

    // 12. Archive class & join prevention
    console.log('\n[Test 14] Archive class & student enrollment block...');
    await ClassService.updateClass(createdClass.id, teacher.id, { isArchived: true });
    try {
      // Create student 3 or try joining
      await ClassService.joinClassByCode(regenResult.classCode, student1.id);
      assert(false, 'Archived class should not accept new joins');
    } catch (err: any) {
      assert(err.status === 400, 'Archived class rejects join request with 400 Bad Request');
    }

    // Activity log checks
    const logs = await prisma.activityLog.findMany({
      where: { entityId: createdClass.id },
    });
    assert(logs.length >= 3, `Activity logs recorded for class operations (${logs.length} logs found)`);

  } catch (err: any) {
    console.error('Test error:', err);
    failed++;
  } finally {
    console.log('\n===============================================================');
    console.log(`📊 Phase 5 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('===============================================================');
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runPhase5Tests();
