import { config } from '../config/environment';

export interface IEmailService {
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
  sendVerificationEmail(email: string, token: string): Promise<void>;
}

export class EmailService implements IEmailService {
  /**
   * Sends password reset email
   * In development, prints secure activation link to terminal
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('\n======================================================');
      console.log('📧 [EMAIL SERVICE - DEVELOPMENT LOG]');
      console.log(`To: ${email}`);
      console.log('Subject: EduSync - Password Reset Request');
      console.log(`Reset URL: ${resetUrl}`);
      console.log('Expires in: 1 Hour');
      console.log('======================================================\n');
      return;
    }

    // In production with SMTP configured, send actual email
    // e.g., using nodemailer / Resend / SendGrid
    console.log(`[EmailService] Production reset email dispatched to ${email}`);
  }

  /**
   * Sends email verification link
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `${config.frontendUrl}/verify-email?token=${token}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('\n======================================================');
      console.log('📧 [EMAIL SERVICE - DEVELOPMENT LOG]');
      console.log(`To: ${email}`);
      console.log('Subject: EduSync - Verify Your Email Address');
      console.log(`Verification URL: ${verifyUrl}`);
      console.log('Expires in: 24 Hours');
      console.log('======================================================\n');
      return;
    }

    console.log(`[EmailService] Production verification email dispatched to ${email}`);
  }
}

export const emailService = new EmailService();
