import { CreateJobDto, UpdateJobDto } from '../dto/job.dto';
import { JobEntity, JobWithRelations } from '../entities/job.entity';
import { JobPhotoEntity } from '../entities/job-photo.entity';
import { JobChecklistItemEntity } from '../entities/job-checklist.entity';

/**
 * Jobs Service Interface
 * Defines the contract for JobsService
 */
export interface IJobsService {
  /**
   * Create a new job
   */
  create(userId: string, data: CreateJobDto): Promise<JobEntity>;

  /**
   * Find all jobs for a user
   */
  findAll(userId: string, userRole?: string): Promise<JobWithRelations[]>;

  /**
   * Find a single job by ID
   */
  findOne(userId: string, jobId: string, userRole?: string): Promise<JobWithRelations>;

  /**
   * Find today's jobs
   */
  findToday(userId: string, userRole?: string): Promise<JobWithRelations[]>;

  /**
   * Update a job
   */
  update(id: string, userId: string, data: UpdateJobDto): Promise<JobEntity>;

  /**
   * Delete a job
   */
  remove(userId: string, jobId: string, userRole?: string): Promise<JobEntity>;

  /**
   * Add a photo to a job
   */
  addPhoto(
    userId: string,
    jobId: string,
    imageUrl: string,
    photoType: 'BEFORE' | 'AFTER',
    userRole?: string,
  ): Promise<JobPhotoEntity>;

  /**
   * Update a checklist item
   */
  updateChecklistItem(
    userId: string,
    jobId: string,
    itemId: string,
    completed: boolean,
    userRole?: string,
  ): Promise<JobChecklistItemEntity>;
}
