import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from './supabase.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
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

  async requestPasswordReset(email: string) {
    const adminClient = this.supabaseService.getAdminClient();
    
    // Check if user exists
    const { data: users } = await adminClient.auth.admin.listUsers();
    const user = users?.users.find(u => u.email === email);
    
    if (!user) {
      // Don't reveal if user exists for security
      return { message: 'If an account exists with this email, a password reset link has been sent.' };
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



