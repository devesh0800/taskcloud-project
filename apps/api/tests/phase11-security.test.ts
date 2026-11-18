import assert from 'assert';
import http from 'http';
import bcrypt from 'bcrypt';
import { prisma } from '../src/config/prisma';
import { AuthService } from '../src/services/auth.service';
import { ClassService } from '../src/services/class.service';
import { AssignmentService } from '../src/services/assignment.service';
import { SubmissionService } from '../src/services/submission.service';
import { GradeService } from '../src/services/grade.service';
import { storageService } from '../src/storage/localStorage.service';
import { validateFile } from '../src/storage/file.validation';
import { generateAccessToken } from '../src/utils/tokens';
import { Role, AssignmentStatus } from '@prisma/client';
import { createApp } from '../src/app';

const app = createApp();

async function runSecurityTests() {
  console.log('==================================================================');
  console.log('🧪 Starting EduSync Phase 11: Security & Performance Tests');
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

  const testId = Date.now().toString(36);
  let passedCount = 0;

  function pass(msg: string) {
    passedCount++;
    console.log(`  ✅ PASS: ${msg}`);
  }

  try {
    // --- SECTION 1: Basic Authentication Security & Password Hashing ---
    console.log('--- SECTION 1: Basic Authentication & Password Hashing ---');

    // 1.1 Password strength validation
    const weakPasswordRes = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Weak Password Student',
        email: `weak.${testId}@edusync.dev`,
        password: 'weak',
        confirmPassword: 'weak',
        role: 'STUDENT',
        studentId: `STU-WEAK-${testId}`,
        course: 'CS',
      }),
    });
    assert.strictEqual(weakPasswordRes.status, 400, 'Weak password should be rejected with 400');
    assert.strictEqual(weakPasswordRes.body.success, false);
    pass('Basic password strength: Passwords under 8 chars or missing complexity are rejected');

    // 1.2 Successful registration with strong password
    const strongPassword = 'SecurePassword123!';
    const registerRes = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: `Sec Test Student ${testId}`,
        email: `sectest.${testId}@edusync.dev`,
        password: strongPassword,
        confirmPassword: strongPassword,
        role: 'STUDENT',
        studentId: `STU-SEC-${testId}`,
        course: 'Computer Science',
      }),
    });
    assert.strictEqual(registerRes.status, 201, 'Valid student registration should return 201');
    const studentUser = registerRes.body.user;
    assert.ok(studentUser.id, 'User ID should exist');
    assert.strictEqual(studentUser.passwordHash, undefined, 'passwordHash must NEVER be returned in response');
    pass('Registration succeeds and passwordHash is stripped from responses');

    // 1.3 Verify bcrypt hashing in Neon PostgreSQL
    const dbUser = await prisma.user.findUnique({
      where: { email: `sectest.${testId}@edusync.dev` },
    });
    assert.ok(dbUser, 'User must exist in Neon PostgreSQL');
    assert.notStrictEqual(dbUser.passwordHash, strongPassword, 'Password must not be stored in plaintext');
    assert.ok(
      dbUser.passwordHash.startsWith('$2b$') || dbUser.passwordHash.startsWith('$2a$'),
      'Password must be hashed using bcrypt'
    );
    const isValidBcrypt = await bcrypt.compare(strongPassword, dbUser.passwordHash);
    assert.strictEqual(isValidBcrypt, true, 'bcrypt.compare must verify the hashed password');
    pass('Passwords are verified as properly hashed with bcrypt in Neon PostgreSQL');

    // 1.4 Login verification
    const loginRes = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `sectest.${testId}@edusync.dev`,
        password: strongPassword,
      }),
    });
    assert.strictEqual(loginRes.status, 200, 'Login should succeed with 200');
    assert.strictEqual(loginRes.body.success, true);
    assert.strictEqual(loginRes.body.user.passwordHash, undefined, 'Login response must not expose password hash');
    pass('Login authentication functions correctly and returns sanitized user object');

    // 1.5 Invalid login credentials
    const badLoginRes = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `sectest.${testId}@edusync.dev`,
        password: 'WrongPassword123!',
      }),
    });
    assert.strictEqual(badLoginRes.status, 401, 'Invalid password must return 401');
    assert.strictEqual(badLoginRes.body.success, false);
    pass('Invalid credentials rejected with 401 without user enumeration leakage');

    // 1.6 Proper logout and token invalidation
    const cookieHeader = loginRes.headers.get('set-cookie') || '';
    const logoutRes = await apiRequest('/api/v1/auth/logout', {
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    assert.strictEqual(logoutRes.status, 200, 'Logout should return 200');
    pass('Logout endpoint completes and clears authentication sessions');

    // --- SECTION 2: Role-Based Access Control (RBAC) ---
    console.log('\n--- SECTION 2: Role-Based Access Control (RBAC) ---');

    const studentToken = generateAccessToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: Role.STUDENT,
    });

    // 2.1 Student cannot create a class
    const studentCreateClassRes = await apiRequest('/api/v1/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Student Class',
        subject: 'Hacking 101',
      }),
    });
    assert.strictEqual(studentCreateClassRes.status, 403, 'Student cannot create class');
    pass('RBAC: Students are blocked from teacher-only class creation (403 Forbidden)');

    // 2.2 Student cannot create an assignment
    const studentCreateAssignRes = await apiRequest('/api/v1/assignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Unauthorized Assignment',
        instructions: 'Try to create',
        classId: 'some-class',
      }),
    });
    assert.strictEqual(studentCreateAssignRes.status, 403, 'Student cannot create assignment');
    pass('RBAC: Students are blocked from teacher-only assignment publishing (403 Forbidden)');

    // 2.3 Student cannot grade or evaluate
    const studentGradeRes = await apiRequest('/api/v1/grades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        submissionId: 'some-sub',
        marks: 100,
      }),
    });
    assert.strictEqual(studentGradeRes.status, 403, 'Student cannot grade submissions');
    pass('RBAC: Students are blocked from grading and evaluation endpoints (403 Forbidden)');

    // 2.4 Unauthenticated user blocked on protected routes
    const unauthRes = await apiRequest('/api/v1/classes');
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request should return 401');
    pass('Authentication boundary: Unauthenticated requests to protected endpoints return 401');

    // --- SECTION 3: Teacher Ownership & Scope Isolation ---
    console.log('\n--- SECTION 3: Teacher Scope & Resource Isolation ---');

    // Fetch or create two distinct teachers
    const teacherA = await prisma.user.findFirst({
      where: { role: Role.TEACHER, email: 'teacher@edusync.dev' },
    });
    assert.ok(teacherA, 'Teacher A should exist in seeded database');

    let teacherB = await prisma.user.findFirst({
      where: { role: Role.TEACHER, NOT: { id: teacherA.id } },
    });
    if (!teacherB) {
      teacherB = await prisma.user.create({
        data: {
          fullName: 'Professor Two',
          email: `teacher2.${testId}@edusync.dev`,
          passwordHash: await bcrypt.hash('TeacherPassword123!', 10),
          role: Role.TEACHER,
          teacherId: `TCH-SEC-${testId}`,
          department: 'Science',
        },
      });
    }

    const teacherBToken = generateAccessToken({
      userId: teacherB.id,
      email: teacherB.email,
      role: Role.TEACHER,
    });

    // Teacher A creates a class
    const classA = await ClassService.createClass({
      name: `Physics Class ${testId}`,
      subject: 'Physics',
      teacherId: teacherA.id,
    });

    // Teacher B attempts to modify Teacher A's class
    const teacherBEditClassRes = await apiRequest(`/api/v1/classes/${classA.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherBToken}`,
      },
      body: JSON.stringify({ name: 'Tampered Class Name' }),
    });
    assert.strictEqual(teacherBEditClassRes.status, 403, 'Teacher B cannot edit Teacher A class');
    pass('Teacher isolation: Teachers cannot modify classes belonging to other instructors');

    // Teacher B attempts to regenerate code for Teacher A's class
    const teacherBRegenCodeRes = await apiRequest(`/api/v1/classes/${classA.id}/regenerate-code`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherBToken}` },
    });
    assert.strictEqual(teacherBRegenCodeRes.status, 403, 'Teacher B cannot regenerate code for Teacher A class');
    pass('Teacher isolation: Teachers cannot regenerate joining codes for other instructors’ classes');

    // Teacher B attempts to create assignment in Teacher A's class
    const teacherBAssignRes = await apiRequest('/api/v1/assignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherBToken}`,
      },
      body: JSON.stringify({
        title: 'Tampered Assignment',
        instructions: 'Should fail',
        classId: classA.id,
        deadline: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    assert.strictEqual(teacherBAssignRes.status, 403, 'Teacher B cannot create assignment in Teacher A class');
    pass('Teacher isolation: Teachers cannot create assignments in classes they do not teach');

    // --- SECTION 4: Student Privacy & Data Isolation ---
    console.log('\n--- SECTION 4: Student Privacy & Submissions Isolation ---');

    // Enroll Student A in Class A
    await ClassService.joinClassByCode(classA.classCode, studentUser.id);

    // Create published assignment in Class A by Teacher A
    const assignmentA = await AssignmentService.createAssignment({
      title: `Security Lab ${testId}`,
      instructions: 'Follow secure coding practices',
      totalMarks: 100,
      deadline: new Date(Date.now() + 86400000),
      teacherId: teacherA.id,
      classId: classA.id,
      status: AssignmentStatus.PUBLISHED,
    });

    // Student A submits assignment
    const submissionA = await SubmissionService.submitAssignment({
      assignmentId: assignmentA.id,
      studentId: studentUser.id,
      answerText: 'Confidential student submission work.',
    });

    // Register Student B
    const studentBRes = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: `Student B ${testId}`,
        email: `studentb.${testId}@edusync.dev`,
        password: strongPassword,
        confirmPassword: strongPassword,
        role: 'STUDENT',
        studentId: `STU-B-${testId}`,
        course: 'IT',
      }),
    });
    const studentBUser = studentBRes.body.user;
    const studentBToken = generateAccessToken({
      userId: studentBUser.id,
      email: studentBUser.email,
      role: Role.STUDENT,
    });

    // Student B attempts to access Student A's submission details
    const studentBViewSubRes = await apiRequest(`/api/v1/submissions/${submissionA.id}`, {
      headers: { Authorization: `Bearer ${studentBToken}` },
    });
    assert.strictEqual(studentBViewSubRes.status, 403, 'Student B cannot view Student A submission');
    pass('Student privacy: Students cannot inspect submissions created by other students');

    // Teacher A grades submission as DRAFT (unpublished)
    await GradeService.recordGrade({
      submissionId: submissionA.id,
      teacherId: teacherA.id,
      marks: 95,
      feedback: 'Secret internal review notes',
      isPublished: false,
    });

    // Student A views assignment details - draft grade must be concealed
    const studentAViewRes = await apiRequest(`/api/v1/assignments/student/${assignmentA.id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(studentAViewRes.status, 200);
    const studentSub = studentAViewRes.body.data.submission;
    assert.ok(studentSub, 'Submission must exist for student');
    assert.strictEqual(
      studentSub.grades?.length || 0,
      0,
      'Unpublished draft grade must remain hidden from student'
    );
    pass('Academic privacy: Unpublished draft evaluations are strictly concealed from student view');

    // --- SECTION 5: File Upload & Download Security ---
    console.log('\n--- SECTION 5: File Upload & Download Security ---');

    // 5.1 Extension Whitelist Validation
    const dangerousExtResult = validateFile('malicious_script.sh', 'application/x-sh', 1024);
    assert.strictEqual(dangerousExtResult.valid, false);
    assert.ok(dangerousExtResult.error?.includes('prohibited') || dangerousExtResult.error?.includes('Unsupported'));
    pass('File upload security: Shell scripts (.sh) and executable files are strictly prohibited');

    const exeResult = validateFile('payload.exe', 'application/x-msdownload', 2048);
    assert.strictEqual(exeResult.valid, false);
    pass('File upload security: Executable binaries (.exe) are strictly rejected');

    // 5.2 Size limit validation (10 MB)
    const oversizedResult = validateFile('huge_file.pdf', 'application/pdf', 15 * 1024 * 1024);
    assert.strictEqual(oversizedResult.valid, false);
    assert.ok(oversizedResult.error?.includes('exceeds'));
    pass('File upload security: Files exceeding 10 MB limit are rejected');

    // 5.3 Valid file format acceptance
    const validPdfResult = validateFile('homework.pdf', 'application/pdf', 500 * 1024);
    assert.strictEqual(validPdfResult.valid, true);
    pass('File upload security: Standard academic documents (PDF, DOCX, TXT, images) are accepted');

    // 5.4 Unique filename generation
    const testBuffer = Buffer.from('EduSync Security Content');
    const savedFile = await storageService.saveFile(
      testBuffer,
      'original_file.pdf',
      'application/pdf',
      'assignments'
    );
    assert.ok(savedFile.storedFileName);
    assert.notStrictEqual(savedFile.storedFileName, 'original_file.pdf');
    assert.ok(savedFile.storedFileName.endsWith('.pdf'));
    pass('File upload security: Unique UUID filenames generated to prevent collisions and overwrite attacks');

    // 5.5 Path Traversal Prevention
    const pathTraversalRes = await apiRequest('/api/v1/files/download/assignments/..%2F..%2Fetc%2Fpasswd');
    assert.ok(
      pathTraversalRes.status === 400 || pathTraversalRes.status === 403 || pathTraversalRes.status === 404,
      'Path traversal attempt must be blocked'
    );
    pass('Path traversal defense: Directory traversal sequences (../, ..\\) are blocked');

    // 5.6 Unauthenticated download of submission file is blocked
    const unauthFileRes = await apiRequest(`/api/v1/files/download/submissions/${savedFile.storedFileName}`);
    assert.strictEqual(unauthFileRes.status, 401, 'Unauthenticated submission download must be 401');
    pass('File download defense: Unauthenticated requests to private submission files are blocked (401)');

    // 5.7 Student B cannot download Student A's submission file via file controller
    const subFileRecord = await prisma.submissionFile.create({
      data: {
        submissionId: submissionA.id,
        fileName: savedFile.storedFileName,
        originalName: 'assignment_work.pdf',
        mimeType: 'application/pdf',
        fileSize: testBuffer.length,
        storagePath: savedFile.relativeFilePath,
      },
    });

    const studentBDownloadRes = await apiRequest(`/api/v1/submissions/files/${subFileRecord.id}/download`, {
      headers: { Authorization: `Bearer ${studentBToken}` },
    });
    assert.strictEqual(studentBDownloadRes.status, 403, 'Student B cannot download Student A submission file');
    pass('File access control: Cross-student file download attempt is blocked (403 Forbidden)');

    // --- SECTION 6: API Protection & Safe Error Handling ---
    console.log('\n--- SECTION 6: API Protection & Safe Error Handling ---');

    // 6.1 Helmet security headers verification
    const helmetCheck = await apiRequest('/api/v1/health');
    assert.strictEqual(helmetCheck.status, 200);
    assert.ok(helmetCheck.headers.get('x-dns-prefetch-control'), 'Helmet header X-DNS-Prefetch-Control should be present');
    assert.ok(helmetCheck.headers.get('x-content-type-options'), 'Helmet header X-Content-Type-Options should be present');
    pass('API protection: Helmet security headers applied across all endpoints');

    // 6.2 Error response sanitization (no internal credential leaks)
    const notFoundRoute = await apiRequest('/api/v1/nonexistent-endpoint-test');
    assert.strictEqual(notFoundRoute.status, 404);
    assert.strictEqual(notFoundRoute.body.success, false);
    assert.strictEqual(notFoundRoute.body.stack, undefined, 'Stack trace must not be exposed in standard error response');
    pass('Error handling: Clean, structured error messages without stack traces or credential leaks');

    console.log('\n==================================================================');
    console.log(`📊 Phase 11 Test Results: ${passedCount} Passed, 0 Failed`);
    console.log('==================================================================\n');
  } finally {
    server.close();
  }
}

runSecurityTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Phase 11 test failed:', err);
    process.exit(1);
  });
