import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobEntity, JobWithRelations } from '../entities/job.entity';

/**
 * Job Response DTO
 * Response format for job endpoints
 */
export class JobResponseDto implements JobEntity {
  @ApiProperty({ description: 'Job ID' })
  id: string;

  @ApiProperty({ description: 'Business ID' })
  businessId: string;

  @ApiProperty({ description: 'Client ID' })
  clientId: string;

  @ApiPropertyOptional({ description: 'Cleaner ID' })
  cleanerId?: string | null;

  @ApiProperty({ enum: ['ONE_OFF', 'RECURRING'], description: 'Job type' })
  type: 'ONE_OFF' | 'RECURRING';

  @ApiPropertyOptional({ enum: ['WEEKLY', 'BI_WEEKLY'], description: 'Frequency for recurring jobs' })
  frequency?: 'WEEKLY' | 'BI_WEEKLY' | null;

  @ApiProperty({ description: 'Scheduled date' })
  scheduledDate: Date;

  @ApiPropertyOptional({ description: 'Scheduled time' })
  scheduledTime?: string | null;

  @ApiProperty({ enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'], description: 'Job status' })
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

  @ApiProperty({ description: 'Reminder enabled' })
  reminderEnabled: boolean;

  @ApiPropertyOptional({ description: 'Reminder time' })
  reminderTime?: string | null;

  @ApiPropertyOptional({ description: 'Reminder sent' })
  reminderSent?: boolean | null;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

/**
 * Job With Relations Response DTO
 * Response format for job with related entities
 */
export class JobWithRelationsResponseDto extends JobResponseDto {
  @ApiPropertyOptional({ description: 'Client information' })
  client?: {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
  };

  @ApiPropertyOptional({ description: 'Cleaner information' })
  cleaner?: {
    id: string;
    email: string;
  } | null;

  @ApiPropertyOptional({ description: 'Business information' })
  business?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'Checklist items' })
  checklist?: Array<{
    id: string;
    itemText: string;
    completed: boolean;
  }>;

  @ApiPropertyOptional({ description: 'Job photos' })
  photos?: Array<{
    id: string;
    imageUrl: string;
    photoType: 'BEFORE' | 'AFTER';
    timestamp: Date;
  }>;

  @ApiPropertyOptional({ description: 'Invoice information' })
  invoice?: {
    id: string;
    invoiceNumber: string;
  } | null;
}

