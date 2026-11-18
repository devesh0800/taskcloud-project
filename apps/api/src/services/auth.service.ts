import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { Role, User } from '@prisma/client';
import {
  generateAccessToken,
  generateRefreshTokenString,
  hashToken,
} from '../utils/tokens';
import { emailService } from './email.service';

const BCRYPT_SALT_ROUNDS = 12;

export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  teacherId?: string | null;
  department?: string | null;
  studentId?: string | null;
  course?: string | null;
  semester?: string | null;
  section?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _hash, ...safe } = user;
  return safe;
}

export class AuthService {
  /**
   * Register a new Student or Teacher account
   * Strictly disallows public registration as ADMIN
   */
  static async register(data: {
    fullName: string;
    email: string;
    password: string;
    role: Role;
    teacherId?: string;
    department?: string;
    studentId?: string;
    course?: string;
    semester?: string;
    section?: string;
  }): Promise<{ user: SafeUser; verificationToken: string }> {
    const normalizedEmail = data.email.toLowerCase().trim();

    // 1. Guard against unauthorized admin role escalation
    if (data.role === Role.ADMIN) {
      throw { status: 400, message: 'Public registration as Administrator is not permitted.' };
    }

    // 2. Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw { status: 400, message: 'An account with this email address already exists.' };
    }

    // 3. Hash password using bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

    // 4. Create user in Neon PostgreSQL
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: data.role,
        teacherId: data.role === Role.TEACHER ? data.teacherId?.trim() : undefined,
        department: data.role === Role.TEACHER ? data.department?.trim() : undefined,
        studentId: data.role === Role.STUDENT ? data.studentId?.trim() : undefined,
        course: data.role === Role.STUDENT ? data.course?.trim() : undefined,
        semester: data.role === Role.STUDENT ? data.semester?.trim() : undefined,
        section: data.role === Role.STUDENT ? data.section?.trim() : undefined,
        isActive: true,
        emailVerified: false,
      },
    });

    // 5. Generate secure email verification token (24-hour expiry)
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawVerificationToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // 6. Dispatch verification email (asynchronous)
    await emailService.sendVerificationEmail(user.email, rawVerificationToken);

    return {
      user: sanitizeUser(user),
      verificationToken: rawVerificationToken,
    };
  }

  /**
   * Authenticate user with email and password
   */
  static async login(
    email: string,
    password: string,
    rememberMe = false
  ): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Lookup user in Neon PostgreSQL
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // 2. Generic authentication error prevents email harvesting
    if (!user) {
      throw { status: 401, message: 'Invalid email or password.' };
    }

    // 3. Verify account active status
    if (!user.isActive) {
      throw { status: 403, message: 'Your account has been deactivated. Please contact an administrator.' };
    }

    // 4. Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw { status: 401, message: 'Invalid email or password.' };
    }

    // 5. Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashToken(rawRefreshToken);

    const refreshTokenDays = rememberMe ? 30 : 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTokenDays);

    // 6. Store hashed refresh token in Neon PostgreSQL
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Refresh access token with Refresh Token rotation
   */
  static async refreshTokens(
    rawRefreshToken: string
  ): Promise<{ user: SafeUser; newAccessToken: string; newRefreshToken: string }> {
    const tokenHash = hashToken(rawRefreshToken);

    // 1. Find token in Neon PostgreSQL
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      throw { status: 401, message: 'Invalid refresh token.' };
    }

    // 2. Detect reuse of revoked token (potential token compromise)
    if (storedToken.revokedAt) {
      // Invalidate all tokens for this user as a security measure
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revokedAt: new Date() },
      });
      throw { status: 401, message: 'Compromised session detected. All sessions revoked. Please log in again.' };
    }

    // 3. Check expiration
    if (new Date() > storedToken.expiresAt) {
      throw { status: 401, message: 'Refresh token has expired. Please log in again.' };
    }

    // 4. Rotate token: Revoke used token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // 5. Generate new access token and new refresh token
    const newAccessToken = generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    });

    const newRawRefreshToken = generateRefreshTokenString();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: hashToken(newRawRefreshToken),
        expiresAt: newExpiresAt,
      },
    });

    return {
      user: sanitizeUser(storedToken.user),
      newAccessToken,
      newRefreshToken: newRawRefreshToken,
    };
  }

  /**
   * Logout user by revoking the specific refresh token
   */
  static async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    const tokenHash = hashToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Get user profile by ID
   */
  static async getMe(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw { status: 404, message: 'User account not found.' };
    }

    return sanitizeUser(user);
  }

  /**
   * Request password reset token
   * Never discloses whether the user email exists
   */
  static async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      // Return cleanly to prevent email enumeration attacks
      return;
    }

    // Invalidate existing reset tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate single-use secure token (1 hour expiry)
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawResetToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await emailService.sendPasswordResetEmail(user.email, rawResetToken);
  }

  /**
   * Reset user password using token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord) {
      throw { status: 400, message: 'Invalid or expired password reset token.' };
    }

    if (resetRecord.usedAt) {
      throw { status: 400, message: 'This password reset link has already been used.' };
    }

    if (new Date() > resetRecord.expiresAt) {
      throw { status: 400, message: 'Password reset link has expired. Please request a new one.' };
    }

    // 1. Hash new password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    // 2. Update user password
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    });

    // 3. Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    // 4. Security: Invalidate all active refresh tokens/sessions across devices
    await prisma.refreshToken.updateMany({
      where: { userId: resetRecord.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Verify user email via token
   */
  static async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashToken(token);

    const verifyRecord = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!verifyRecord) {
      throw new Error('Invalid or expired email verification link.');
    }

    if (verifyRecord.usedAt) {
      throw new Error('This verification link has already been used.');
    }

    if (new Date() > verifyRecord.expiresAt) {
      throw new Error('Email verification link has expired. Please request a new one.');
    }

    // 1. Mark user email as verified
    await prisma.user.update({
      where: { id: verifyRecord.userId },
      data: { emailVerified: true },
    });

    // 2. Mark token used
    await prisma.emailVerificationToken.update({
      where: { id: verifyRecord.id },
      data: { usedAt: new Date() },
    });
  }

  /**
   * Resend email verification
   */
  static async resendVerification(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.emailVerified) {
      return; // Return silently
    }

    // Delete existing verification tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawVerificationToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await emailService.sendVerificationEmail(user.email, rawVerificationToken);
  }
}
