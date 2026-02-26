import { IsEmail, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateCleanerDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;

  /** 'invite' = send invite link for signup via Google/email (only supported method - no temp password) */
  @IsString()
  @IsOptional()
  @IsIn(['invite'] as const)
  method?: 'invite';
}
