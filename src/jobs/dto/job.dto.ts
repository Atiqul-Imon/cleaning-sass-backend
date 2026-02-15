import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean, IsNotEmpty, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum JobType {
  ONE_OFF = 'ONE_OFF',
  RECURRING = 'RECURRING',
}

export enum JobFrequency {
  WEEKLY = 'WEEKLY',
  BI_WEEKLY = 'BI_WEEKLY',
}

export enum JobStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

/**
 * Create Job DTO
 * Enhanced with comprehensive validation and Swagger documentation
 */
export class CreateJobDto {
  @ApiProperty({
    description: 'Client ID',
    example: 'clt_1234567890',
  })
  @IsString()
  @IsNotEmpty({ message: 'Client ID is required' })
  @MinLength(1, { message: 'Client ID cannot be empty' })
  clientId: string;

  @ApiPropertyOptional({
    description: 'Cleaner ID (optional)',
    example: 'cln_1234567890',
  })
  @IsString()
  @IsOptional()
  cleanerId?: string;

  @ApiProperty({
    enum: JobType,
    description: 'Job type',
    example: JobType.ONE_OFF,
  })
  @IsEnum(JobType, { message: 'Job type must be ONE_OFF or RECURRING' })
  type: JobType;

  @ApiPropertyOptional({
    enum: JobFrequency,
    description: 'Frequency for recurring jobs (required if type is RECURRING)',
    example: JobFrequency.WEEKLY,
  })
  @IsEnum(JobFrequency, { message: 'Frequency must be WEEKLY or BI_WEEKLY' })
  @IsOptional()
  frequency?: JobFrequency;

  @ApiProperty({
    description: 'Scheduled date (ISO 8601 format)',
    example: '2024-12-25',
  })
  @IsDateString({}, { message: 'Scheduled date must be a valid date string' })
  @IsNotEmpty({ message: 'Scheduled date is required' })
  scheduledDate: string;

  @ApiPropertyOptional({
    description: 'Scheduled time (HH:mm format)',
    example: '14:30',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Scheduled time must be in HH:mm format',
  })
  scheduledTime?: string;

  @ApiPropertyOptional({
    description: 'Enable reminder notifications',
    default: true,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value !== undefined ? Boolean(value) : true)
  reminderEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Reminder time before job',
    enum: ['30 minutes', '1 hour', '2 hours', '1 day', '2 days'],
    example: '1 day',
  })
  @IsString()
  @IsOptional()
  @Matches(/^(30 minutes|1 hour|2 hours|1 day|2 days)$/, {
    message: 'Reminder time must be one of: 30 minutes, 1 hour, 2 hours, 1 day, 2 days',
  })
  reminderTime?: string;
}

/**
 * Update Job DTO
 * Enhanced with comprehensive validation and Swagger documentation
 */
export class UpdateJobDto {
  @ApiPropertyOptional({
    description: 'Cleaner ID',
    example: 'cln_1234567890',
  })
  @IsString()
  @IsOptional()
  cleanerId?: string;

  @ApiPropertyOptional({
    description: 'Scheduled date (ISO 8601 format)',
    example: '2024-12-25',
  })
  @IsDateString({}, { message: 'Scheduled date must be a valid date string' })
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({
    description: 'Scheduled time (HH:mm format)',
    example: '14:30',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Scheduled time must be in HH:mm format',
  })
  scheduledTime?: string;

  @ApiPropertyOptional({
    enum: JobStatus,
    description: 'Job status',
    example: JobStatus.IN_PROGRESS,
  })
  @IsEnum(JobStatus, { message: 'Status must be SCHEDULED, IN_PROGRESS, or COMPLETED' })
  @IsOptional()
  status?: JobStatus;

  @ApiPropertyOptional({
    description: 'Enable reminder notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value !== undefined ? Boolean(value) : undefined)
  reminderEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Reminder time before job',
    enum: ['30 minutes', '1 hour', '2 hours', '1 day', '2 days'],
    example: '1 day',
  })
  @IsString()
  @IsOptional()
  @Matches(/^(30 minutes|1 hour|2 hours|1 day|2 days)$/, {
    message: 'Reminder time must be one of: 30 minutes, 1 hour, 2 hours, 1 day, 2 days',
  })
  reminderTime?: string;
}









