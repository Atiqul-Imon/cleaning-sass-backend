import { Injectable } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from './supabase.service';
import { TwilioWhatsAppService } from './twilio-whatsapp.service';
import { UserRole } from '@prisma/client';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_LENGTH = 6;

/** Normalize UK/local phone to E.164 (e.g. +447700900123). */
function normalizePhoneToE164(phone: string): string {
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) {
    return clean;
  }
  if (clean.startsWith('0')) {
    return `+44${clean.slice(1)}`;
  }
  if (clean.length >= 10) {
    return `+44${clean}`;
  }
  return `+${clean}`;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
    private twilioWhatsApp: TwilioWhatsAppService,
  ) {}

  async getUserRole(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role || null;
  }

  async setUserRole(userId: string, role: UserRole) {
    return this.prisma.user.upsert({
      where: { id: userId },
      update: { role },
      create: {
        id: userId,
        email: '', // Will be set from Supabase user
        role,
      },
    });
  }

  async createOrUpdateUser(supabaseUserId: string, email: string, role: UserRole = UserRole.OWNER) {
    return this.prisma.user.upsert({
      where: { id: supabaseUserId },
      update: { email },
      create: {
        id: supabaseUserId,
        email,
        role,
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const adminClient = this.supabaseService.getAdminClient();
    const anonClient = this.supabaseService.getAnonClient();

    // First, get user email
    const { data: userData } = await adminClient.auth.admin.getUserById(userId);
    if (!userData?.user?.email) {
      throw new Error('User not found');
    }

    // Verify current password by attempting sign in with anon client
    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPassword,
    });

    if (signInError) {
      throw new Error('Current password is incorrect');
    }

    // Update password using admin client
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { message: 'Password changed successfully' };
  }

  /**
   * Find user by phone: Owner by Business.phone, Cleaner by User.phone.
   */
  async findUserByPhone(phoneE164: string): Promise<{ userId: string; email: string } | null> {
    const owner = await this.prisma.business.findFirst({
      where: { phone: phoneE164 },
      select: { userId: true, user: { select: { email: true } } },
    });
    if (owner) {
      return { userId: owner.userId, email: owner.user.email };
    }
    const cleaner = await this.prisma.user.findFirst({
      where: { phone: phoneE164 },
      select: { id: true, email: true },
    });
    if (cleaner) {
      return { userId: cleaner.id, email: cleaner.email };
    }
    return null;
  }

  async requestPasswordResetOtp(phone: string): Promise<{ message: string }> {
    const phoneE164 = normalizePhoneToE164(phone);
    const user = await this.findUserByPhone(phoneE164);
    if (!user) {
      return { message: 'If an account with this number exists, you will receive an OTP shortly.' };
    }

    const otp = String(randomInt(0, 10 ** OTP_LENGTH - 1)).padStart(OTP_LENGTH, '0');
    const otpHash = createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await this.prisma.passwordResetOtp.create({
      data: { phone: phoneE164, otpHash, expiresAt },
    });

    if (this.twilioWhatsApp.isConfigured()) {
      try {
        await this.twilioWhatsApp.sendWhatsApp(
          phoneE164,
          `Your Clenvora password reset code is: ${otp}. It expires in 10 minutes.`,
        );
      } catch (err) {
        console.error('[Auth] Failed to send WhatsApp OTP:', err);
        throw new Error('Could not send OTP. Please try again later.');
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth] WhatsApp not configured. OTP for', phoneE164, ':', otp);
      }
      throw new Error(
        'WhatsApp OTP is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.',
      );
    }

    return { message: 'If an account with this number exists, you will receive an OTP shortly.' };
  }

  async resetPasswordWithOtp(
    phone: string,
    otp: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const phoneE164 = normalizePhoneToE164(phone);
    const otpHash = createHash('sha256').update(otp).digest('hex');

    const record = await this.prisma.passwordResetOtp.findFirst({
      where: { phone: phoneE164, otpHash },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new Error('Invalid or expired OTP. Please request a new code.');
    }

    const user = await this.findUserByPhone(phoneE164);
    if (!user) {
      throw new Error('Invalid or expired OTP.');
    }

    const adminClient = this.supabaseService.getAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(user.userId, {
      password: newPassword,
    });
    if (error) {
      throw new Error(error.message);
    }

    await this.prisma.passwordResetOtp.deleteMany({ where: { phone: phoneE164 } });

    return { message: 'Password reset successfully. You can sign in with your new password.' };
  }

  async requestPasswordReset(email: string) {
    const adminClient = this.supabaseService.getAdminClient();

    // Check if user exists
    const { data: users } = await adminClient.auth.admin.listUsers();
    const user = users?.users.find((u) => u.email === email);

    if (!user) {
      // Don't reveal if user exists for security
      return {
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }

    // Generate password reset link
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (error) {
      throw new Error(error.message);
    }

    // In production, you would send this link via email
    // For now, we'll return it (you can log it or send via email service)
    return {
      message: 'Password reset link generated',
      resetLink: data.properties?.action_link, // This would normally be sent via email
    };
  }
}
