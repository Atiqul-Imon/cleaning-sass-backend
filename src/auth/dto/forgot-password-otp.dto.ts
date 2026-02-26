import { IsString, Matches } from 'class-validator';

export class ForgotPasswordOtpDto {
  @IsString()
  @Matches(/^[\d\s+()-]{10,20}$/, {
    message: 'Enter a valid phone number (e.g. 07xxx or +44 7xxx)',
  })
  phone!: string;
}
