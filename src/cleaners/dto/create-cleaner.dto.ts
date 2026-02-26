import { IsEmail, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateCleanerDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;

  /** 'password' = create with temp password (default); 'invite' = send invite link for signup via Google/email */
  @IsString()
  @IsOptional()
  @IsIn(['password', 'invite'])
  method?: 'password' | 'invite' = 'password';
}
