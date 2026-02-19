import { IsEmail, IsString, IsOptional } from 'class-validator';

export class CreateCleanerDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;
}
