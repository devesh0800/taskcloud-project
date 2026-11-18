import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });
import http from 'http';
import jwt from 'jsonwebtoken';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../src/app';
import { initSocketIO } from '../src/sockets/socket.server';
import { config } from '../src/config/environment';
import { prisma } from '../src/config/prisma';
import { NotificationService } from '../src/services/notification.service';
import { ClassService } from '../src/services/class.service';
import { AssignmentService } from '../src/services/assignment.service';
import { SubmissionService } from '../src/services/submission.service';
import { GradeService } from '../src/services/grade.service';
import { Role } from '@prisma/client';

async function runPhase9Tests() {
  console.log('==================================================================');
  console.log('🧪 Starting EduSync Phase 9: Real-Time Sync & Notifications Tests');
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

  // Helper to generate JWT access token matching server configuration
  function generateToken(user: { id: string; email: string; role: Role }) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      config.jwt.accessSecret,
      { expiresIn: '1h' }
    );
  }

  const TEST_PORT = 5098;
  const SERVER_URL = `http://localhost:${TEST_PORT}`;
  let testHttpServer: http.Server | null = null;
  const activeSockets: ClientSocket[] = [];

  try {
    // 0. Setup test HTTP & Socket.IO server
    console.log('[Setup 1/3] Initializing test HTTP server and Socket.IO engine...');
    const app = createApp();
    testHttpServer = http.createServer(app);
    initSocketIO(testHttpServer, 'http://localhost:3000');

    await new Promise<void>((resolve) => {
      testHttpServer!.listen(TEST_PORT, () => {
        resolve();
      });
    });

    // 1. Fetch seed users
    console.log('[Setup 2/3] Fetching seeded test users from Neon PostgreSQL...');
    const teacher = await prisma.user.findUnique({ where: { email: 'teacher@edusync.dev' } });
    const student1 = await prisma.user.findUnique({ where: { email: 'alex.rivera@edusync.dev' } });
    const student2 = await prisma.user.findUnique({ where: { email: 'maya.patel@edusync.dev' } });

    if (!teacher || !student1 || !student2) {
      throw new Error('Seeded test users (teacher, alex, maya) not found in Neon database.');
    }

    const teacherToken = generateToken(teacher);
    const student1Token = generateToken(student1);
    const student2Token = generateToken(student2);

    // 2. Create test class with student1 enrolled (student2 not enrolled)
    console.log('[Setup 3/3] Setting up test class and enrollment...');
    const testId = Date.now().toString().slice(-5);
    const testClass = await ClassService.createClass({
      name: `Realtime Systems Lab CS-${testId}`,
      description: 'Distributed pub/sub and WebSocket synchronization architecture',
      subject: 'CS-702',
      teacherId: teacher.id,
    });
    await ClassService.joinClassByCode(testClass.classCode, student1.id);

    console.log(`\n--- SECTION 1: Socket.IO Authentication Middleware ---`);

    // Test 1: Reject connection with no credentials
    await new Promise<void>((resolve) => {
      const client = ioClient(SERVER_URL, {
        transports: ['websocket'],
        reconnection: false,
        timeout: 2000,
      });

      client.on('connect_error', (err) => {
        assert(
          err.message.includes('Unauthorized'),
          'Socket connection without token is rejected with Unauthorized error'
        );
        client.disconnect();
        resolve();
      });

      client.on('connect', () => {
        assert(false, 'Unauthenticated socket connection should not succeed');
        client.disconnect();
        resolve();
      });
    });

    // Test 2: Reject connection with invalid/malformed token
    await new Promise<void>((resolve) => {
      const client = ioClient(SERVER_URL, {
        auth: { token: 'invalid_malformed_token_xyz' },
        transports: ['websocket'],
        reconnection: false,
        timeout: 2000,
      });

      client.on('connect_error', (err) => {
        assert(
          err.message.includes('Unauthorized') || err.message.includes('verification failed'),
          'Socket connection with invalid token is rejected with verification failure'
        );
        client.disconnect();
        resolve();
      });

      client.on('connect', () => {
        assert(false, 'Socket connection with invalid token should not succeed');
        client.disconnect();
        resolve();
      });
    });

    // Test 3: Accept connection with valid JWT token (passed in handshake auth)
    let socketStudent1: ClientSocket | null = null;
    await new Promise<void>((resolve) => {
      socketStudent1 = ioClient(SERVER_URL, {
        auth: { token: student1Token },
        transports: ['websocket'],
        reconnection: false,
      });
      activeSockets.push(socketStudent1);

      socketStudent1.on('connect', () => {
        assert(true, 'Socket successfully authenticates and connects with valid JWT token');
        resolve();
      });

      socketStudent1.on('connect_error', (err) => {
        assert(false, `Authenticated socket should connect, got: ${err.message}`);
        resolve();
      });
    });

    // Test 4: Accept connection with Bearer header
    let socketTeacher: ClientSocket | null = null;
    await new Promise<void>((resolve) => {
      socketTeacher = ioClient(SERVER_URL, {
        extraHeaders: {
          Authorization: `Bearer ${teacherToken}`,
        },
        transports: ['websocket'],
        reconnection: false,
      });
      activeSockets.push(socketTeacher);

      socketTeacher.on('connect', () => {
        assert(true, 'Socket successfully authenticates via Authorization Bearer header');
        resolve();
      });

      socketTeacher.on('connect_error', (err) => {
        assert(false, `Socket with Bearer header should connect, got: ${err.message}`);
        resolve();
      });
    });

    console.log(`\n--- SECTION 2: User Room Isolation & Privacy ---`);

    // Test 5: Verify Student 1 receives events directed to user_${student1.id}
    await new Promise<void>((resolve) => {
      const payloadMessage = `Hello Student 1 ${testId}`;

      socketStudent1!.on('test_user_event', (data) => {
        assert(
          data.message === payloadMessage,
          'User automatically joins private room user_{userId} and receives personal messages'
        );
        resolve();
      });

      // Import emitToUser
      const { emitToUser } = require('../src/sockets/socket.server');
      emitToUser(student1.id, 'test_user_event', { message: payloadMessage });
    });

    // Test 6: Verify Student 1 DOES NOT receive events addressed to Student 2
    await new Promise<void>((resolve) => {
      let receivedLeakedEvent = false;

      socketStudent1!.on('private_student2_event', () => {
        receivedLeakedEvent = true;
      });

      const { emitToUser } = require('../src/sockets/socket.server');
      emitToUser(student2.id, 'private_student2_event', { secret: 'top_secret' });

      setTimeout(() => {
        assert(!receivedLeakedEvent, 'Private room isolation: User cannot receive another user private events');
        resolve();
      }, 300);
    });

    console.log(`\n--- SECTION 3: Authorized Class Room Subscription ---`);

    // Test 7: Enrolled student can join class room
    await new Promise<void>((resolve) => {
      socketStudent1!.emit(
        'join_class_room',
        { classId: testClass.id },
        (response: { success: boolean; room?: string }) => {
          assert(
            response.success === true && response.room === `class_${testClass.id}`,
            'Enrolled student is authorized to join class room'
          );
          resolve();
        }
      );
    });

    // Test 8: Teacher can join class room
    await new Promise<void>((resolve) => {
      socketTeacher!.emit(
        'join_class_room',
        { classId: testClass.id },
        (response: { success: boolean; room?: string }) => {
          assert(
            response.success === true && response.room === `class_${testClass.id}`,
            'Class teacher is authorized to join class room'
          );
          resolve();
        }
      );
    });

    // Test 9: Unenrolled student (Student 2) CANNOT join class room (FORBIDDEN)
    let socketStudent2: ClientSocket | null = null;
    await new Promise<void>((resolve) => {
      socketStudent2 = ioClient(SERVER_URL, {
        auth: { token: student2Token },
        transports: ['websocket'],
        reconnection: false,
      });
      activeSockets.push(socketStudent2);

      socketStudent2.on('connect', () => {
        socketStudent2!.emit(
          'join_class_room',
          { classId: testClass.id },
          (response: { success: boolean; error?: string }) => {
            assert(
              response.success === false && response.error?.includes('Forbidden'),
              'Unenrolled student is rejected with Forbidden error when trying to join class room'
            );
            resolve();
          }
        );
      });
    });

    console.log(`\n--- SECTION 4: Database-backed Notification Management ---`);

    // Test 10: Create notification with entityId and link
    const notif1 = await NotificationService.createNotification({
      userId: student1.id,
      title: 'Real-time System Update',
      message: 'New lab materials have been synchronized to your dashboard.',
      type: 'SYSTEM_ANNOUNCEMENT',
      entityId: testClass.id,
      link: `/student/classes/${testClass.id}`,
    });

    assert(
      notif1.id && notif1.isRead === false && notif1.link === `/student/classes/${testClass.id}`,
      'Notification created in Neon PostgreSQL with entityId, link, and isRead=false'
    );

    // Test 11: List notifications with pagination
    const listRes = await NotificationService.listByUser(student1.id, { page: 1, limit: 10 });
    assert(
      listRes.notifications.length > 0 &&
        listRes.total >= 1 &&
        listRes.unreadCount >= 1 &&
        listRes.notifications.some((n) => n.id === notif1.id),
      'List notifications returns paginated records with total and unreadCount'
    );

    // Test 12: Mark single notification as read
    const marked = await NotificationService.markAsRead(notif1.id, student1.id);
    assert(marked.isRead === true, 'Mark notification as read updates isRead to true in database');

    const unreadAfterSingle = await NotificationService.getUnreadCount(student1.id);
    assert(typeof unreadAfterSingle === 'number', 'Get unread count returns current integer count');

    // Test 13: Create batch notifications and mark all as read
    await NotificationService.createBatchNotifications([student1.id, student2.id], {
      title: 'Batch Notice',
      message: 'Campus academic calendar revised.',
      type: 'ANNOUNCEMENT',
    });

    const markAllResult = await NotificationService.markAllAsRead(student1.id);
    assert(
      markAllResult.updatedCount >= 1,
      'Mark all as read bulk updates all unread notifications for user'
    );

    const unreadAfterAll = await NotificationService.getUnreadCount(student1.id);
    assert(unreadAfterAll === 0, 'Unread count becomes 0 after marking all notifications as read');

    // Test 14: Delete notification
    const deleted = await NotificationService.deleteNotification(notif1.id, student1.id);
    assert(deleted === true, 'Notification deleted successfully from database');

    const verifyDeleted = await prisma.notification.findUnique({ where: { id: notif1.id } });
    assert(verifyDeleted === null, 'Deleted notification record is verified removed from Neon PostgreSQL');

    console.log(`\n--- SECTION 5: End-to-End Real-Time Event Workflows ---`);

    // Test 15 & 16: Assignment Published Event & Notification
    console.log('[Workflow 1] Teacher publishes assignment...');
    const assignment = await AssignmentService.createAssignment({
      title: `PubSub Messaging Engine Lab ${testId}`,
      subject: 'Distributed Systems',
      instructions: 'Build a bi-directional event stream with acknowledgment.',
      classId: testClass.id,
      teacherId: teacher.id,
      totalMarks: 100,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isPublished: false,
    });

    await new Promise<void>(async (resolve) => {
      // Setup listener on student1's socket
      socketStudent1!.once('assignment:published', (data: any) => {
        assert(
          data.assignmentId === assignment.id && data.classId === testClass.id,
          'Socket.IO emits assignment:published event to class room when teacher publishes assignment'
        );
        resolve();
      });

      // Teacher publishes assignment
      await AssignmentService.publishAssignment(assignment.id, teacher.id);
    });

    // Verify persistent notification was created for student1
    const student1AssignmentNotif = await prisma.notification.findFirst({
      where: {
        userId: student1.id,
        type: 'ASSIGNMENT_PUBLISHED',
        entityId: assignment.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(
      student1AssignmentNotif !== null &&
        student1AssignmentNotif.link === `/student/assignments/${assignment.id}`,
      'Database notification created for student with direct assignment link upon publishing'
    );

    // Test 17 & 18: Student Submission Event & Notification to Teacher
    console.log('[Workflow 2] Student submits assignment...');
    const submissionEventPromise = new Promise<void>((resolve) => {
      socketTeacher!.once('submission:created', (data: any) => {
        assert(
          data.assignmentId === assignment.id && data.studentId === student1.id,
          'Socket.IO emits submission:created event to class room when student submits'
        );
        resolve();
      });
    });

    const submissionRecord = await SubmissionService.submitAssignment({
      assignmentId: assignment.id,
      studentId: student1.id,
      answerText: 'WebSocket stream tested and handling 10,000 msg/sec with zero loss.',
    });

    await submissionEventPromise;

    const teacherSubmissionNotif = await prisma.notification.findFirst({
      where: {
        userId: teacher.id,
        type: 'SUBMISSION_CREATED',
        entityId: submissionRecord.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(
      teacherSubmissionNotif !== null &&
        teacherSubmissionNotif.link === `/teacher/evaluations/${submissionRecord.id}`,
      'Database notification created for teacher with link to submission evaluation'
    );

    // Test 19 & 20: Teacher Evaluates and Publishes Grade Real-Time Notification
    console.log('[Workflow 3] Teacher evaluates submission and publishes grade...');
    const gradeEventPromise = new Promise<void>((resolve) => {
      socketStudent1!.once('grade:published', (data: any) => {
        assert(
          data.submissionId === submissionRecord.id && data.grade === 'A+' && data.marks === 98,
          'Socket.IO emits grade:published event to student when grade is published'
        );
        resolve();
      });
    });

    await GradeService.recordGrade({
      submissionId: submissionRecord.id,
      teacherId: teacher.id,
      marks: 98,
      grade: 'A+',
      feedback: 'Outstanding architecture and high throughput results!',
      evaluationComments: 'Ready for production deployment.',
      isPublished: true,
    });

    await gradeEventPromise;

    const studentGradeNotif = await prisma.notification.findFirst({
      where: {
        userId: student1.id,
        type: 'GRADE_PUBLISHED',
        entityId: submissionRecord.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(
      studentGradeNotif !== null &&
        studentGradeNotif.link === `/student/grades/${submissionRecord.id}`,
      'Database notification created for student with direct grade details link upon grading'
    );
  } catch (error: any) {
    console.error('Fatal test execution error:', error);
    failed++;
  } finally {
    // Teardown sockets and test server
    console.log('\n[Teardown] Disconnecting test sockets and stopping test server...');
    for (const s of activeSockets) {
      if (s.connected) s.disconnect();
    }
    if (testHttpServer) {
      await new Promise<void>((resolve) => {
        testHttpServer!.close(() => resolve());
      });
    }
    await prisma.$disconnect();

    console.log('\n==================================================================');
    console.log(`📊 Phase 9 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('==================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runPhase9Tests();
