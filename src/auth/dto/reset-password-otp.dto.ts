import { IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordOtpDto {
  @IsString()
  @Matches(/^[\d\s+()-]{10,20}$/, {
    message: 'Enter a valid phone number',
  })
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword!: string;
}
