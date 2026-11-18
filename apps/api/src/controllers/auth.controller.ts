import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import {
  registerTeacherSchema,
  registerStudentSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../validators/auth.validator';
import { Role } from '@prisma/client';

const isProduction = process.env.NODE_ENV === 'production';

// Helper to set authentication cookies
function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  rememberMe = false
): void {
  const refreshMaxAge = rememberMe
    ? 30 * 24 * 60 * 60 * 1000 // 30 days
    : 7 * 24 * 60 * 60 * 1000; // 7 days

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 mins
    path: '/',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: refreshMaxAge,
    path: '/',
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', {
    path: '/',
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  res.clearCookie('refreshToken', {
    path: '/',
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
}

export class AuthController {
  /**
   * POST /api/v1/auth/register
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role } = req.body;

      let validatedData: any;
      if (role === 'TEACHER') {
        validatedData = registerTeacherSchema.parse(req.body);
      } else if (role === 'STUDENT') {
        validatedData = registerStudentSchema.parse(req.body);
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid role specified for public registration.',
        });
        return;
      }

      const { user, verificationToken } = await AuthService.register({
        ...validatedData,
        role: role as Role,
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        user,
        ...(process.env.NODE_ENV !== 'production' && { devVerificationToken: verificationToken }),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = loginSchema.parse(req.body);

      const { user, accessToken, refreshToken } = await AuthService.login(
        validatedData.email,
        validatedData.password,
        validatedData.rememberMe
      );

      setAuthCookies(res, accessToken, refreshToken, validatedData.rememberMe);

      // Determine redirect path by role
      const redirectPath =
        user.role === Role.TEACHER
          ? '/teacher/dashboard'
          : user.role === Role.ADMIN
          ? '/admin/dashboard'
          : '/student/dashboard';

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        user,
        accessToken, // Also returned in body for optional Authorization header clients
        redirectPath,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Look for refreshToken in cookies or Authorization / body
      const rawRefreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken || req.headers['x-refresh-token'];

      if (!rawRefreshToken) {
        res.status(401).json({
          success: false,
          message: 'No refresh token provided.',
        });
        return;
      }

      const { user, newAccessToken, newRefreshToken } = await AuthService.refreshTokens(
        rawRefreshToken
      );

      setAuthCookies(res, newAccessToken, newRefreshToken);

      res.status(200).json({
        success: true,
        message: 'Tokens rotated successfully.',
        user,
        accessToken: newAccessToken,
      });
    } catch (err: any) {
      clearAuthCookies(res);
      res.status(401).json({
        success: false,
        message: err.message || 'Session expired. Please log in again.',
      });
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      await AuthService.logout(rawRefreshToken);
      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const user = await AuthService.getMe(req.user.userId);
      res.status(200).json({
        success: true,
        user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      await AuthService.forgotPassword(email);

      res.status(200).json({
        success: true,
        message:
          'If an account exists with this email address, password reset instructions have been sent.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      await AuthService.resetPassword(token, password);

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. Please sign in with your new credentials.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/verify-email
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = verifyEmailSchema.parse(req.body);
      await AuthService.verifyEmail(token);

      res.status(200).json({
        success: true,
        message: 'Your email address has been successfully verified! You may now sign in.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/resend-verification
   */
  static async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = resendVerificationSchema.parse(req.body);
      await AuthService.resendVerification(email);

      res.status(200).json({
        success: true,
        message: 'If the account exists and is unverified, a new verification link has been sent.',
      });
    } catch (err) {
      next(err);
    }
  }
}
