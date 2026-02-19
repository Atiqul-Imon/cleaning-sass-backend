import { Injectable } from '@nestjs/common';
import { CreateJobDto, UpdateJobDto, JobType } from '../dto/job.dto';
import { JobEntity } from '../entities/job.entity';
import { addWeeks } from 'date-fns';

/**
 * Job Domain Service
 * Contains business logic for jobs
 * Separated from data access and orchestration
 */
@Injectable()
export class JobDomainService {
  /**
   * Validate job creation data
   */
  validateCreateJob(data: CreateJobDto): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!data.clientId) {
      errors.push('Client is required');
    }

    if (!data.type) {
      errors.push('Job type is required');
    }

    if (!data.scheduledDate) {
      errors.push('Scheduled date is required');
    }

    // Validate date is not in the past
    if (data.scheduledDate) {
      const scheduledDate = new Date(data.scheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (scheduledDate < today) {
        errors.push('Scheduled date cannot be in the past');
      }
    }

    // Validate recurring job has frequency
    if (data.type === JobType.RECURRING && !data.frequency) {
      errors.push('Frequency is required for recurring jobs');
    }

    // Validate reminder time format
    if (data.reminderTime && !this.isValidReminderTime(data.reminderTime)) {
      errors.push('Invalid reminder time format');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate job update data
   */
  validateUpdateJob(data: UpdateJobDto): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Validate date is not in the past (if provided)
    if (data.scheduledDate) {
      const scheduledDate = new Date(data.scheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (scheduledDate < today) {
        errors.push('Scheduled date cannot be in the past');
      }
    }

    // Validate reminder time format
    if (data.reminderTime && !this.isValidReminderTime(data.reminderTime)) {
      errors.push('Invalid reminder time format');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Transform job data for creation
   */
  transformJobData(data: CreateJobDto, businessId: string): any {
    const scheduledDate = new Date(data.scheduledDate);

    return {
      businessId,
      clientId: data.clientId,
      cleanerId: data.cleanerId,
      type: data.type,
      frequency: data.frequency,
      scheduledDate,
      scheduledTime: data.scheduledTime,
      reminderEnabled: data.reminderEnabled !== undefined ? data.reminderEnabled : true,
      reminderTime: data.reminderTime || '1 day',
      status: 'SCHEDULED',
    };
  }

  /**
   * Generate recurring jobs data
   */
  generateRecurringJobs(
    originalJob: JobEntity,
    startDate: Date,
    frequency: 'WEEKLY' | 'BI_WEEKLY',
    count: number,
  ): Array<Omit<JobEntity, 'id' | 'createdAt' | 'updatedAt'>> {
    const jobs: Array<Omit<JobEntity, 'id' | 'createdAt' | 'updatedAt'>> = [];

    for (let i = 1; i <= count; i++) {
      const nextDate = frequency === 'WEEKLY' ? addWeeks(startDate, i) : addWeeks(startDate, i * 2);

      jobs.push({
        businessId: originalJob.businessId,
        clientId: originalJob.clientId,
        cleanerId: originalJob.cleanerId,
        type: 'RECURRING',
        frequency,
        scheduledDate: nextDate,
        scheduledTime: originalJob.scheduledTime,
        status: 'SCHEDULED',
        reminderEnabled: originalJob.reminderEnabled,
        reminderTime: originalJob.reminderTime,
        reminderSent: false,
      });
    }

    return jobs;
  }

  /**
   * Check if job can be edited
   */
  canEditJob(jobStatus: string): boolean {
    return jobStatus !== 'COMPLETED';
  }

  /**
   * Check if job can be deleted
   */
  canDeleteJob(jobStatus: string): boolean {
    return jobStatus === 'SCHEDULED';
  }

  /**
   * Get next status for a job
   */
  getNextStatus(currentStatus: string): string | null {
    const statusFlow: Record<string, string> = {
      SCHEDULED: 'IN_PROGRESS',
      IN_PROGRESS: 'COMPLETED',
    };
    return statusFlow[currentStatus] || null;
  }

  /**
   * Check if reminder time format is valid
   */
  private isValidReminderTime(time: string): boolean {
    const validTimes = ['30 minutes', '1 hour', '2 hours', '1 day', '2 days'];
    return validTimes.includes(time);
  }
}
