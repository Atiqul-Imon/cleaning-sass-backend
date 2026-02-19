import { Controller, Get, UseGuards, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import type { AuthenticatedUser } from '../shared/types/user.types';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './auth.decorator';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SignupDto } from './dto/signup.dto';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private supabaseService: SupabaseService,
  ) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const role = await this.authService.getUserRole(user.id);
    return {
      id: user.id,
      email: user.email,
      role,
    };
  }

  @Post('set-role')
  @UseGuards(AuthGuard)
  async setRole(@CurrentUser() user: AuthenticatedUser, @Body('role') role: UserRole) {
    return this.authService.setUserRole(user.id, role);
  }

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    try {
      const adminClient = this.supabaseService.getAdminClient();

      // Check if user already exists
      const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers();

      if (listError) {
        throw new HttpException(
          `Failed to check existing users: ${listError.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const existing = existingUsers?.users.find((u) => u.email === signupDto.email);

      if (existing) {
        throw new HttpException('User with this email already exists', HttpStatus.CONFLICT);
      }

      // Create user with email already confirmed
      const { data, error } = await adminClient.auth.admin.createUser({
        email: signupDto.email,
        password: signupDto.password,
        email_confirm: true, // Auto-confirm email - this skips email verification
      });

      if (error) {
        throw new HttpException(`Failed to create user: ${error.message}`, HttpStatus.BAD_REQUEST);
      }

      if (!data?.user) {
        throw new HttpException(
          'User creation failed: No user data returned',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Create user in our database with default OWNER role
      try {
        await this.authService.createOrUpdateUser(
          data.user.id,
          data.user.email || signupDto.email,
          UserRole.OWNER,
        );
      } catch (dbError: any) {
        // If database creation fails, we should still return success
        // but log the error for investigation
        console.error('Failed to create user in database:', dbError);
        // Optionally, you might want to delete the Supabase user here
        // For now, we'll continue as the user exists in Supabase
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        message: 'User created successfully. Email is already confirmed.',
      };
    } catch (error: any) {
      // If it's already an HttpException, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }

      // Otherwise, wrap it in an HttpException
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }
}
