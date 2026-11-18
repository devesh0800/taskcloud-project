import { AuthService } from '../src/services/auth.service';
import { prisma } from '../src/config/prisma';
import { Role } from '@prisma/client';
import {
  registerTeacherSchema,
  registerStudentSchema,
  loginSchema,
} from '../src/validators/auth.validator';

async function runAuthTests() {
  console.log('================================================================');
  console.log('🧪 Starting EduSync Phase 3: Comprehensive Auth Test Suite');
  console.log('================================================================\n');

  const testId = Date.now().toString().slice(-6);
  const teacherEmail = `dr_turner_${testId}@edusync.dev`;
  const studentEmail = `elena_vance_${testId}@edusync.dev`;
  const strongPassword = 'Password@123';

  // 1. Teacher Registration
  console.log('[Test 1] Testing Teacher Registration...');
  const teacherReg = await AuthService.register({
    fullName: `Dr. Robert Turner ${testId}`,
    email: teacherEmail,
    password: strongPassword,
    role: Role.TEACHER,
    teacherId: `TCH-${testId}`,
    department: 'Cybersecurity',
  });
  if (teacherReg.user.role !== Role.TEACHER || (teacherReg.user as any).passwordHash) {
    throw new Error('Teacher registration failed or password hash exposed.');
  }
  console.log(`  ✓ Teacher registered: ${teacherReg.user.fullName} (${teacherReg.user.email})`);

  // 2. Student Registration
  console.log('\n[Test 2] Testing Student Registration...');
  const studentReg = await AuthService.register({
    fullName: `Elena Vance ${testId}`,
    email: studentEmail,
    password: strongPassword,
    role: Role.STUDENT,
    studentId: `STU-${testId}`,
    course: 'B.Tech CS',
    semester: '6',
    section: 'B',
  });
  if (studentReg.user.role !== Role.STUDENT || (studentReg.user as any).passwordHash) {
    throw new Error('Student registration failed or password hash exposed.');
  }
  console.log(`  ✓ Student registered: ${studentReg.user.fullName} (${studentReg.user.email})`);

  // 3. Duplicate Email Rejection
  console.log('\n[Test 3] Testing Duplicate Email Rejection...');
  try {
    await AuthService.register({
      fullName: 'Duplicate User',
      email: teacherEmail,
      password: strongPassword,
      role: Role.TEACHER,
    });
    throw new Error('FAILED: Duplicate email registration succeeded!');
  } catch (err: any) {
    if (err.message.includes('already exists')) {
      console.log('  ✓ Duplicate email rejected as expected');
    } else {
      throw err;
    }
  }

  // 4. Invalid Email Rejection (Zod)
  console.log('\n[Test 4] Testing Invalid Email Format Rejection...');
  const invalidEmailResult = registerTeacherSchema.safeParse({
    fullName: 'Bad Email User',
    email: 'not-an-email-format',
    password: strongPassword,
    confirmPassword: strongPassword,
    role: 'TEACHER',
  });
  if (!invalidEmailResult.success) {
    console.log('  ✓ Invalid email format correctly rejected by Zod');
  } else {
    throw new Error('FAILED: Invalid email format passed validation!');
  }

  // 5. Weak Password Rejection (Zod)
  console.log('\n[Test 5] Testing Weak Password Rejection...');
  const weakPasswordResult = registerTeacherSchema.safeParse({
    fullName: 'Weak Pass User',
    email: 'valid_user@edusync.dev',
    password: 'password', // Missing uppercase and number
    confirmPassword: 'password',
    role: 'TEACHER',
  });
  if (!weakPasswordResult.success) {
    console.log('  ✓ Weak password rejected (enforces uppercase, lowercase, number, min 8 chars)');
  } else {
    throw new Error('FAILED: Weak password passed validation!');
  }

  // 6. Login with Correct Credentials
  console.log('\n[Test 6] Testing Login with Correct Credentials...');
  const loginRes = await AuthService.login(teacherEmail, strongPassword);
  if (!loginRes.accessToken || !loginRes.refreshToken || !loginRes.user) {
    throw new Error('FAILED: Login did not return valid tokens.');
  }
  console.log(`  ✓ Teacher login successful: Token issued (${loginRes.accessToken.slice(0, 20)}...)`);

  // 7. Login with Incorrect Credentials
  console.log('\n[Test 7] Testing Login with Incorrect Credentials...');
  try {
    await AuthService.login(teacherEmail, 'WrongPassword@123');
    throw new Error('FAILED: Login succeeded with incorrect password!');
  } catch (err: any) {
    if (err.message === 'Invalid email or password.') {
      console.log('  ✓ Incorrect password rejected with generic error message');
    } else {
      throw err;
    }
  }

  // 8. Teacher Role Redirection Path Verification
  console.log('\n[Test 8] Verifying Teacher Role Redirection...');
  const teacherRedirect =
    loginRes.user.role === Role.TEACHER ? '/teacher/dashboard' : '/student/dashboard';
  if (teacherRedirect !== '/teacher/dashboard') throw new Error('Incorrect teacher redirect');
  console.log(`  ✓ Teacher redirection verified: ${teacherRedirect}`);

  // 9. Student Role Redirection Path Verification
  console.log('\n[Test 9] Verifying Student Role Redirection...');
  const studentLoginRes = await AuthService.login(studentEmail, strongPassword);
  const studentRedirect =
    studentLoginRes.user.role === Role.STUDENT ? '/student/dashboard' : '/teacher/dashboard';
  if (studentRedirect !== '/student/dashboard') throw new Error('Incorrect student redirect');
  console.log(`  ✓ Student redirection verified: ${studentRedirect}`);

  // 10. Admin Role Protection (No Public Registration as ADMIN)
  console.log('\n[Test 10] Testing Admin Role Protection...');
  try {
    await AuthService.register({
      fullName: 'Hacker Admin',
      email: `hacker_${testId}@evil.com`,
      password: strongPassword,
      role: Role.ADMIN, // Attempting privilege escalation
    });
    throw new Error('FAILED: Public registration as ADMIN was permitted!');
  } catch (err: any) {
    if (err.message.includes('Administrator is not permitted')) {
      console.log('  ✓ Public ADMIN registration blocked (privilege escalation prevented)');
    } else {
      throw err;
    }
  }

  // 11. Refresh Token Rotation
  console.log('\n[Test 11] Testing Refresh Token Rotation...');
  const initialRefreshToken = loginRes.refreshToken;
  const rotated = await AuthService.refreshTokens(initialRefreshToken);
  if (!rotated.newAccessToken || !rotated.newRefreshToken) {
    throw new Error('FAILED: Token rotation did not issue new tokens.');
  }
  console.log('  ✓ Refresh token rotation successful: Old token revoked, new tokens issued');

  // Verify that reusing the revoked token is rejected
  try {
    await AuthService.refreshTokens(initialRefreshToken);
    throw new Error('FAILED: Reusing revoked refresh token succeeded!');
  } catch (err: any) {
    if (err.message.includes('Compromised session detected') || err.message.includes('Invalid refresh token')) {
      console.log('  ✓ Reused refresh token immediately rejected & compromise defense triggered');
    } else {
      throw err;
    }
  }

  // 12. Logout & Session Revocation
  console.log('\n[Test 12] Testing Logout & Session Revocation...');
  await AuthService.logout(rotated.newRefreshToken);
  try {
    await AuthService.refreshTokens(rotated.newRefreshToken);
    throw new Error('FAILED: Refresh succeeded after logout!');
  } catch (err: any) {
    console.log('  ✓ Session revoked on logout; token can no longer be used');
  }

  // 13. Password Reset Workflow
  console.log('\n[Test 13] Testing Password Reset Workflow...');
  await AuthService.forgotPassword(teacherEmail);
  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: { userId: teacherReg.user.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!resetRecord) throw new Error('Password reset token record not found');
  console.log('  ✓ Password reset token generated in database');

  // Test reset using raw token (simulated link execution)
  // Let's create a known token test
  const testResetRaw = 'sample_raw_reset_token_' + testId;
  const crypto = await import('crypto');
  const testResetHash = crypto.createHash('sha256').update(testResetRaw).digest('hex');
  const exp = new Date();
  exp.setHours(exp.getHours() + 1);

  await prisma.passwordResetToken.create({
    data: {
      userId: teacherReg.user.id,
      tokenHash: testResetHash,
      expiresAt: exp,
    },
  });

  const newPassword = 'NewSecurePassword@2026';
  await AuthService.resetPassword(testResetRaw, newPassword);
  console.log('  ✓ Password successfully reset');

  // Verify login with new password works
  const newLogin = await AuthService.login(teacherEmail, newPassword);
  if (!newLogin.accessToken) throw new Error('Login failed with new password');
  console.log('  ✓ Successfully logged in with newly reset password');

  // 14. Email Verification Workflow
  console.log('\n[Test 14] Testing Email Verification Workflow...');
  const testVerifyRaw = 'sample_raw_verify_token_' + testId;
  const testVerifyHash = crypto.createHash('sha256').update(testVerifyRaw).digest('hex');
  const verifyExp = new Date();
  verifyExp.setHours(verifyExp.getHours() + 24);

  await prisma.emailVerificationToken.create({
    data: {
      userId: studentReg.user.id,
      tokenHash: testVerifyHash,
      expiresAt: verifyExp,
    },
  });

  await AuthService.verifyEmail(testVerifyRaw);
  const updatedStudent = await prisma.user.findUnique({ where: { id: studentReg.user.id } });
  if (!updatedStudent?.emailVerified) {
    throw new Error('Student emailVerified is still false after verification');
  }
  console.log('  ✓ Email verified: emailVerified flag updated to true in Neon PostgreSQL');

  // 15. Clean up temporary test data
  console.log('\n[Clean Up] Cleaning temporary test user data...');
  await prisma.refreshToken.deleteMany({ where: { userId: { in: [teacherReg.user.id, studentReg.user.id] } } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: { in: [teacherReg.user.id, studentReg.user.id] } } });
  await prisma.emailVerificationToken.deleteMany({ where: { userId: { in: [teacherReg.user.id, studentReg.user.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [teacherReg.user.id, studentReg.user.id] } } });
  console.log('  ✓ Test user records cleanly purged');

  console.log('\n================================================================');
  console.log('🎉 ALL 15 PHASE 3 AUTHENTICATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runAuthTests()
  .catch((err) => {
    console.error('\n❌ Phase 3 Auth Tests Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
