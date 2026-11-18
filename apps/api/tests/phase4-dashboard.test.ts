import { TeacherController } from '../src/controllers/teacher.controller';
import { StudentController } from '../src/controllers/student.controller';
import { AdminController } from '../src/controllers/admin.controller';
import { ProfileController } from '../src/controllers/profile.controller';
import { prisma } from '../src/config/prisma';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';

function createMockReq(user: any, body: any = {}, query: any = {}, params: any = {}) {
  return {
    user,
    body,
    query,
    params,
    headers: {},
  } as any;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    bodyData: null,
  };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.bodyData = data;
    return res;
  };
  return res;
}

async function runDashboardDirectTests() {
  console.log('========================================================');
  console.log('🧪 Starting Phase 4: Direct Controller & Database Test Suite');
  console.log('========================================================\n');

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
    // Look up Seeded Teacher
    const teacher = await prisma.user.findUnique({
      where: { email: 'teacher@edusync.dev' },
    });
    if (!teacher) throw new Error('Seeded teacher not found');

    const teacherAuthUser = {
      userId: teacher.id,
      email: teacher.email,
      role: teacher.role,
    };

    // 1. Teacher Dashboard
    console.log('[Section 1] Teacher Dashboard & Coursework Aggregations');
    const tDashReq = createMockReq(teacherAuthUser);
    const tDashRes = createMockRes();
    await TeacherController.getDashboard(tDashReq, tDashRes, (err) => { if (err) throw err; });

    assert(tDashRes.statusCode === 200, 'TeacherController.getDashboard returns 200');
    assert(typeof tDashRes.bodyData.data.stats.totalStudents === 'number', 'Teacher stats totalStudents is numeric');
    assert(typeof tDashRes.bodyData.data.stats.totalClasses === 'number', 'Teacher stats totalClasses is numeric');
    assert(Array.isArray(tDashRes.bodyData.data.recentAssignments), 'Teacher recentAssignments is an array');

    // 2. Teacher Classes
    const tClassesRes = createMockRes();
    await TeacherController.getClasses(tDashReq, tClassesRes, (err) => { if (err) throw err; });
    assert(tClassesRes.statusCode === 200 && Array.isArray(tClassesRes.bodyData.data), 'TeacherController.getClasses returns classes array');

    // 3. Teacher Assignments
    const tAssignRes = createMockRes();
    await TeacherController.getAssignments(tDashReq, tAssignRes, (err) => { if (err) throw err; });
    assert(tAssignRes.statusCode === 200 && Array.isArray(tAssignRes.bodyData.data), 'TeacherController.getAssignments returns assignments array');

    // 4. Teacher Submissions
    const tSubsRes = createMockRes();
    await TeacherController.getSubmissions(tDashReq, tSubsRes, (err) => { if (err) throw err; });
    assert(tSubsRes.statusCode === 200 && Array.isArray(tSubsRes.bodyData.data), 'TeacherController.getSubmissions returns submissions array');

    // 5. Teacher Students
    const tStudentsRes = createMockRes();
    await TeacherController.getStudents(tDashReq, tStudentsRes, (err) => { if (err) throw err; });
    assert(tStudentsRes.statusCode === 200 && Array.isArray(tStudentsRes.bodyData.data), 'TeacherController.getStudents returns students array');

    // 6. Teacher Analytics
    const tAnalyticsRes = createMockRes();
    await TeacherController.getAnalytics(tDashReq, tAnalyticsRes, (err) => { if (err) throw err; });
    assert(tAnalyticsRes.statusCode === 200 && Array.isArray(tAnalyticsRes.bodyData.data.assignmentPerformance), 'TeacherController.getAnalytics returns assignmentPerformance');

    // Look up Seeded Student
    console.log('\n[Section 2] Student Dashboard & Academic Tracking');
    const student = await prisma.user.findUnique({
      where: { email: 'alex.rivera@edusync.dev' },
    });
    if (!student) throw new Error('Seeded student not found');

    const studentAuthUser = {
      userId: student.id,
      email: student.email,
      role: student.role,
    };

    // 7. Student Dashboard
    const sDashReq = createMockReq(studentAuthUser);
    const sDashRes = createMockRes();
    await StudentController.getDashboard(sDashReq, sDashRes, (err) => { if (err) throw err; });

    assert(sDashRes.statusCode === 200, 'StudentController.getDashboard returns 200');
    assert(typeof sDashRes.bodyData.data.stats.totalAssignments === 'number', 'Student stats totalAssignments is numeric');
    assert(Array.isArray(sDashRes.bodyData.data.upcomingAssignments), 'Student upcomingAssignments is an array');
    assert(sDashRes.bodyData.data.performance !== undefined, 'Student performance metrics generated');

    // 8. Student Classes
    const sClassesRes = createMockRes();
    await StudentController.getClasses(sDashReq, sClassesRes, (err) => { if (err) throw err; });
    assert(sClassesRes.statusCode === 200 && Array.isArray(sClassesRes.bodyData.data), 'StudentController.getClasses returns classes array');

    // 9. Student Assignments
    const sAssignRes = createMockRes();
    await StudentController.getAssignments(sDashReq, sAssignRes, (err) => { if (err) throw err; });
    assert(sAssignRes.statusCode === 200 && Array.isArray(sAssignRes.bodyData.data), 'StudentController.getAssignments returns assignments array');

    // 10. Student Submissions
    const sSubsRes = createMockRes();
    await StudentController.getSubmissions(sDashReq, sSubsRes, (err) => { if (err) throw err; });
    assert(sSubsRes.statusCode === 200 && Array.isArray(sSubsRes.bodyData.data), 'StudentController.getSubmissions returns submissions array');

    // 11. Student Grades
    const sGradesRes = createMockRes();
    await StudentController.getGrades(sDashReq, sGradesRes, (err) => { if (err) throw err; });
    assert(sGradesRes.statusCode === 200 && Array.isArray(sGradesRes.bodyData.data), 'StudentController.getGrades returns grades array');

    // Profile Management
    console.log('\n[Section 3] Profile Management & Password Security');
    const pGetRes = createMockRes();
    await ProfileController.getProfile(sDashReq, pGetRes, (err) => { if (err) throw err; });
    assert(pGetRes.statusCode === 200 && pGetRes.bodyData.data.email === student.email, 'ProfileController.getProfile returns correct user');

    const pUpdateReq = createMockReq(studentAuthUser, { section: 'Section A1' });
    const pUpdateRes = createMockRes();
    await ProfileController.updateProfile(pUpdateReq, pUpdateRes, (err) => { if (err) throw err; });
    assert(pUpdateRes.statusCode === 200 && pUpdateRes.bodyData.data.section === 'Section A1', 'ProfileController.updateProfile modifies database fields');

    // Admin Dashboard & Directory
    console.log('\n[Section 4] Admin Overview & User Management');
    const adminEmail = 'admin@edusync.dev';
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      const hash = await bcrypt.hash('Admin@12345', 12);
      admin = await prisma.user.create({
        data: {
          fullName: 'System Administrator',
          email: adminEmail,
          passwordHash: hash,
          role: Role.ADMIN,
          isActive: true,
          emailVerified: true,
        },
      });
    }

    const adminAuthUser = {
      userId: admin.id,
      email: admin.email,
      role: admin.role,
    };

    const aDashReq = createMockReq(adminAuthUser);
    const aDashRes = createMockRes();
    await AdminController.getDashboard(aDashReq, aDashRes, (err) => { if (err) throw err; });
    assert(aDashRes.statusCode === 200, 'AdminController.getDashboard returns 200');
    assert(aDashRes.bodyData.data.stats.totalUsers >= 3, 'Admin stats reports correct platform user count');

    const aUsersReq = createMockReq(adminAuthUser, {}, { search: 'teacher' });
    const aUsersRes = createMockRes();
    await AdminController.getUsers(aUsersReq, aUsersRes, (err) => { if (err) throw err; });
    assert(aUsersRes.statusCode === 200 && aUsersRes.bodyData.data.users.length > 0, 'AdminController.getUsers supports search and pagination');

    // Audit logs
    const aLogsRes = createMockRes();
    await AdminController.getActivityLogs(aDashReq, aLogsRes, (err) => { if (err) throw err; });
    assert(aLogsRes.statusCode === 200 && Array.isArray(aLogsRes.bodyData.data.logs), 'AdminController.getActivityLogs returns audit history');

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    console.log('\n========================================================');
    console.log(`📊 Phase 4 Direct Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('========================================================');
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runDashboardDirectTests();
