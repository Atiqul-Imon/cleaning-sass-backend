import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum JobType {
  ONE_OFF = 'ONE_OFF',
  RECURRING = 'RECURRING',
}

export enum JobFrequency {
  WEEKLY = 'WEEKLY',
  BI_WEEKLY = 'BI_WEEKLY',
}

export class CreateJobDto {
  @IsString()
  clientId: string;

  @IsString()
  @IsOptional()
  cleanerId?: string;

  @IsEnum(JobType)
  type: JobType;

  @IsEnum(JobFrequency)
  @IsOptional()
  frequency?: JobFrequency;

  @IsDateString()
  scheduledDate: string;

  @IsString()
  @IsOptional()
  scheduledTime?: string;
}

export class UpdateJobDto {
  @IsString()
  @IsOptional()
  cleanerId?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsString()
  @IsOptional()
  scheduledTime?: string;

  @IsEnum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'])
  @IsOptional()
  status?: string;
}






