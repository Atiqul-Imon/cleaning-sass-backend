import { Controller, Get, UseGuards, Post, Body } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './auth.decorator';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private supabaseService: SupabaseService,
  ) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: any) {
    const role = await this.authService.getUserRole(user.id);
    return {
      id: user.id,
      email: user.email,
      role,
    };
  }

  @Post('set-role')
  @UseGuards(AuthGuard)
  async setRole(
    @CurrentUser() user: any,
    @Body('role') role: 'OWNER' | 'CLEANER',
  ) {
    return this.authService.setUserRole(user.id, role);
  }

  @Post('signup')
  async signup(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    const adminClient = this.supabaseService.getAdminClient();
    
    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existing = existingUsers?.users.find(u => u.email === email);
    
    if (existing) {
      throw new Error('User with this email already exists');
    }

    // Create user with email already confirmed
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email - this skips email verification
    });

    if (error) {
      throw new Error(error.message);
    }

    // Create user in our database with default OWNER role
    await this.authService.createOrUpdateUser(
      data.user.id,
      data.user.email!,
      'OWNER',
    );

    return {
      user: data.user,
      message: 'User created successfully. Email is already confirmed.',
    };
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(
    @CurrentUser() user: any,
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


