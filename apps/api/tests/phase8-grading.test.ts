import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });
import { GradeService } from '../src/services/grade.service';
import { SubmissionService } from '../src/services/submission.service';
import { AssignmentService } from '../src/services/assignment.service';
import { ClassService } from '../src/services/class.service';
import { prisma } from '../src/config/prisma';
import { AssignmentStatus, SubmissionStatus, Role } from '@prisma/client';

async function runPhase8Tests() {
  console.log('==================================================================');
  console.log('🧪 Starting EduSync Phase 8: Teacher Evaluation & Grading Tests');
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

    // Setup: Create class and enroll student1 & student2
    console.log('[Setup] Creating class, publishing assignment and student submitting...');
    const testClass = await ClassService.createClass({
      name: `Algorithms & Optimization CS-${testId}`,
      description: 'Dynamic programming, greedy algorithms and complexity theory',
      subject: 'CS-601',
      teacherId: teacher.id,
    });
    await ClassService.joinClassByCode(testClass.classCode, student1.id);
    await ClassService.joinClassByCode(testClass.classCode, student2.id);

    const assignment = await AssignmentService.createAssignment({
      title: `Dynamic Programming Knapsack Problem ${testId}`,
      subject: 'Algorithms',
      instructions: 'Submit Python algorithm and complexity analysis.',
      classId: testClass.id,
      teacherId: teacher.id,
      totalMarks: 100,
      deadline: new Date(Date.now() + 48 * 3600 * 1000),
      allowResubmission: true,
      status: AssignmentStatus.PUBLISHED,
    });

    // Student1 submits work
    const submission1 = await SubmissionService.submitAssignment({
      assignmentId: assignment.id,
      studentId: student1.id,
      answerText: 'def knapsack(W, wt, val, n): dp = [[0 for _ in range(W + 1)] for _ in range(n + 1)]...',
    });

    // Student2 submits work
    const submission2 = await SubmissionService.submitAssignment({
      assignmentId: assignment.id,
      studentId: student2.id,
      answerText: 'Memoized recursion approach with O(N*W) time and space complexity...',
    });

    assert(submission1.id !== undefined && submission2.id !== undefined, 'Submissions created in Neon PostgreSQL');

    // 1. Grade calculation helper tests
    console.log('\n[Test 1 & 2] Percentage and Grade calculations...');
    const pct1 = GradeService.calculatePercentage(85, 100);
    assert(pct1 === 85, 'Percentage calculated correctly (85%)');

    const gradeAplus = GradeService.calculateLetterGrade(95, 100);
    const gradeA = GradeService.calculateLetterGrade(85, 100);
    const gradeB = GradeService.calculateLetterGrade(75, 100);
    const gradeC = GradeService.calculateLetterGrade(65, 100);
    const gradeD = GradeService.calculateLetterGrade(50, 100);
    const gradeF = GradeService.calculateLetterGrade(35, 100);

    assert(
      gradeAplus === 'A+' &&
        gradeA === 'A' &&
        gradeB === 'B' &&
        gradeC === 'C' &&
        gradeD === 'D' &&
        gradeF === 'F',
      'All letter grades (A+, A, B, C, D, F) mapped accurately from percentage ranges'
    );

    // 2. Marks validation (negative marks & marks > maxMarks)
    console.log('\n[Test 3 & 4] Marks boundaries validation...');
    try {
      await GradeService.recordGrade({
        submissionId: submission1.id,
        teacherId: teacher.id,
        marks: -10,
        feedback: 'Negative marks test',
      });
      assert(false, 'Negative marks should throw error');
    } catch (err: any) {
      assert(err.status === 400, 'Negative marks rejected with 400 Bad Request');
    }

    try {
      await GradeService.recordGrade({
        submissionId: submission1.id,
        teacherId: teacher.id,
        marks: 150, // Max is 100
        feedback: 'Excessive marks test',
      });
      assert(false, 'Marks exceeding maxMarks should throw error');
    } catch (err: any) {
      assert(err.status === 400, 'Marks above maximum rejected with 400 Bad Request');
    }

    // 3. Teacher saves Draft Evaluation
    console.log('\n[Test 5, 6, 7] Teacher saves draft evaluation (invisible to student)...');
    const draftGrade = await GradeService.recordGrade({
      submissionId: submission1.id,
      teacherId: teacher.id,
      marks: 88,
      grade: 'A',
      feedback: 'Very thorough solution. Consider space optimization.',
      evaluationComments: 'Candidate for TA position next semester.',
      isPublished: false,
    });

    assert(draftGrade.id !== undefined, 'Draft grade record created in Neon PostgreSQL');
    assert(draftGrade.isPublished === false, 'Grade isPublished flag is false');

    // Verify submission status remains UNDER_REVIEW while draft
    const subAfterDraft = await prisma.submission.findUnique({
      where: { id: submission1.id },
    });
    assert(subAfterDraft?.status === SubmissionStatus.UNDER_REVIEW, 'Submission status set to UNDER_REVIEW during draft');

    // Verify draft is completely INVISIBLE to student
    const studentGradesListDraft = await GradeService.listStudentGrades(student1.id);
    const foundInStudentList = studentGradesListDraft.grades.find((g) => g.submissionId === submission1.id);
    assert(foundInStudentList === undefined, 'Draft grade does NOT appear in student grades list');

    try {
      await GradeService.getStudentGradeDetails(submission1.id, student1.id);
      assert(false, 'Draft grade details should not be accessible to student');
    } catch (err: any) {
      assert(err.status === 404, 'Student grade detail returns 404 for draft evaluation');
    }

    // 4. Teacher publishes evaluation
    console.log('\n[Test 8, 9, 10] Teacher publishes grades...');
    const publishedGrade = await GradeService.publishGrade(draftGrade.id, teacher.id);
    assert(publishedGrade.isPublished === true, 'Grade isPublished successfully updated to true');

    const subAfterPublish = await prisma.submission.findUnique({
      where: { id: submission1.id },
    });
    assert(subAfterPublish?.status === SubmissionStatus.EVALUATED, 'Submission status updated to EVALUATED');

    // 5. Student receives notification in PostgreSQL
    console.log('\n[Test 11] Student receives notification...');
    const studentNotif = await prisma.notification.findFirst({
      where: {
        userId: student1.id,
        type: 'GRADE_PUBLISHED',
      },
    });
    assert(studentNotif !== null, 'Notification record stored in PostgreSQL for student');

    // 6. Student views published grade and feedback
    console.log('\n[Test 12 & 13] Student views published marks and feedback...');
    const studentGradeDetails = await GradeService.getStudentGradeDetails(submission1.id, student1.id);
    assert(studentGradeDetails.marksObtained === 88, 'Student views accurate marks (88)');
    assert(studentGradeDetails.grade === 'A', 'Student views letter grade (A)');
    assert(
      studentGradeDetails.feedback?.includes('space optimization'),
      'Student views teacher qualitative feedback'
    );

    // 7. Security: Student2 cannot access Student1's grade
    console.log('\n[Test 14] Cross-student access is forbidden...');
    try {
      await GradeService.getStudentGradeDetails(submission1.id, student2.id);
      assert(false, 'Student should not access other student grade');
    } catch (err: any) {
      assert(err.status === 403, 'Cross-student grade access rejected with 403 Forbidden');
    }

    // 8. Re-evaluation & Evaluation History
    console.log('\n[Test 15 & 16] Re-evaluation preserves historical records...');
    const reEvaluation = await GradeService.recordGrade({
      submissionId: submission1.id,
      teacherId: teacher.id,
      marks: 92,
      grade: 'A+',
      feedback: 'Re-evaluated after student clarified space optimization in viva.',
      isPublished: true,
    });

    assert(reEvaluation.marks === 92, 'New evaluation score updated to 92');

    const history = await GradeService.getSubmissionGradingHistory(submission1.id, {
      userId: teacher.id,
      role: Role.TEACHER,
    });
    assert(history.length >= 2, 'Grading history retains previous evaluation records without overwriting');

    // 9. Teacher requests resubmission
    console.log('\n[Test 17 & 18] Teacher requests resubmission for student2...');
    const resubmitReq = await GradeService.requestResubmission(
      submission2.id,
      teacher.id,
      'Please re-write code without recursion to prevent recursion depth limit errors.'
    );
    assert(
      resubmitReq.status === SubmissionStatus.RESUBMISSION_REQUIRED,
      'Submission2 status updated to RESUBMISSION_REQUIRED'
    );

    const resubmitNotif = await prisma.notification.findFirst({
      where: {
        userId: student2.id,
        type: 'RESUBMISSION_REQUIRED',
      },
    });
    assert(resubmitNotif !== null, 'Resubmission notification sent to student2');

    // 10. Teacher assignment-level analytics
    console.log('\n[Test 19 & 20] Teacher assignment analytics...');
    const assignAnalytics = await GradeService.getAssignmentAnalytics(assignment.id, teacher.id);
    assert(assignAnalytics.totalStudents === 2, 'Analytics: totalStudents is 2');
    assert(assignAnalytics.totalSubmissions === 2, 'Analytics: totalSubmissions is 2');
    assert(assignAnalytics.averageMarks > 0, 'Analytics: averageMarks computed correctly');
    assert(assignAnalytics.gradeDistribution.length === 6, 'Analytics: gradeDistribution contains all ranges');

    // 11. Student performance analytics
    console.log('\n[Test 21 & 22] Student performance analytics...');
    const studentAnalytics = await GradeService.getStudentAnalytics(student1.id);
    assert(studentAnalytics.summary.totalEvaluated >= 1, 'Student analytics: totalEvaluated is at least 1');
    assert(studentAnalytics.marksOverTime.length >= 1, 'Student analytics: marksOverTime trend is populated');
  } catch (error: any) {
    console.error('❌ Test execution error:', error);
    failed++;
  } finally {
    console.log('\n===============================================================');
    console.log(`Phase 8 Tests Completed: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runPhase8Tests();
