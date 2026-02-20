import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { BusinessService } from '../business/business.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateJobDto, UpdateJobDto, JobType } from './dto/job.dto';
import { JobsRepository } from './repositories/jobs.repository';
import { IJobsService } from './interfaces/jobs.service.interface';
import { JobEntity, JobWithRelations } from './entities/job.entity';
import { JobPhotoEntity } from './entities/job-photo.entity';
import { JobChecklistItemEntity } from './entities/job-checklist.entity';
import { JobDomainService } from './domain/job.domain.service';
import { BusinessIdDomainService } from '../shared/domain/business-id.domain.service';

@Injectable()
export class JobsService implements IJobsService {
  constructor(
    private prisma: PrismaService,
    private jobsRepository: JobsRepository,
    private businessService: BusinessService,
    private whatsappService: WhatsAppService,
    private jobDomainService: JobDomainService,
    private businessIdService: BusinessIdDomainService,
  ) {}

  async create(userId: string, data: CreateJobDto) {
    const startTime = Date.now();
    console.log('='.repeat(80));
    console.log('[JOB CREATION] Starting job creation process');
    console.log('[JOB CREATION] User ID:', userId);
    console.log('[JOB CREATION] Job data received:', JSON.stringify(data, null, 2));

    try {
      // Step 1: Get business
      console.log('[JOB CREATION] Step 1: Fetching business for user...');
      const business = await this.businessService.findByUserId(userId);
      if (!business) {
        console.error('[JOB CREATION] ❌ Business not found for user:', userId);
        throw new NotFoundException('Business not found. Please complete business setup first.');
      }
      console.log('[JOB CREATION] ✅ Business found:', {
        id: business.id,
        name: business.name,
        userId: business.userId,
      });

      // Step 2: Validate client exists
      console.log('[JOB CREATION] Step 2: Validating client...');
      const client = await this.prisma.client.findUnique({
        where: { id: data.clientId },
        select: { id: true, name: true, businessId: true },
      });

      if (!client) {
        console.error('[JOB CREATION] ❌ Client not found:', data.clientId);
        throw new NotFoundException(`Client with ID ${data.clientId} not found`);
      }

      if (client.businessId !== business.id) {
        console.error('[JOB CREATION] ❌ Client does not belong to business:', {
          clientBusinessId: client.businessId,
          userBusinessId: business.id,
        });
        throw new ForbiddenException('Client does not belong to your business');
      }
      console.log('[JOB CREATION] ✅ Client validated:', { id: client.id, name: client.name });

      // Step 3: Handle cleaner assignment - if not provided, assign owner
      let cleanerId = data.cleanerId;
      console.log('[JOB CREATION] Step 3: Processing cleaner assignment...');
      if (!cleanerId) {
        console.log('[JOB CREATION] No cleaner provided, assigning owner as cleaner');
        cleanerId = userId;
        console.log('[JOB CREATION] ✅ Owner assigned as cleaner:', userId);
      } else {
        // Validate cleaner exists and belongs to business
        console.log('[JOB CREATION] Validating provided cleaner...');
        const cleaner = await this.prisma.user.findUnique({
          where: { id: cleanerId },
          select: { id: true, email: true, role: true },
        });

        if (!cleaner) {
          console.error('[JOB CREATION] ❌ Cleaner not found:', cleanerId);
          throw new NotFoundException(`Cleaner with ID ${cleanerId} not found`);
        }

        // Check if cleaner is assigned to this business
        const businessCleaner = await this.prisma.businessCleaner.findFirst({
          where: {
            cleanerId,
            businessId: business.id,
            status: 'ACTIVE',
          },
        });

        if (!businessCleaner && cleaner.role !== 'OWNER') {
          console.error('[JOB CREATION] ❌ Cleaner not assigned to business:', {
            cleanerId,
            businessId: business.id,
          });
          throw new ForbiddenException('Cleaner is not assigned to your business');
        }

        console.log('[JOB CREATION] ✅ Cleaner validated:', {
          id: cleaner.id,
          email: cleaner.email,
          role: cleaner.role,
        });
      }

      // Step 4: Prepare job data
      console.log('[JOB CREATION] Step 4: Preparing job data...');
      const scheduledDate = new Date(data.scheduledDate);
      if (isNaN(scheduledDate.getTime())) {
        console.error('[JOB CREATION] ❌ Invalid scheduled date:', data.scheduledDate);
        throw new Error('Invalid scheduled date format');
      }

      const jobData = {
        businessId: business.id,
        clientId: data.clientId,
        cleanerId, // Now always has a value (owner or provided cleaner)
        type: data.type,
        frequency: data.frequency,
        scheduledDate,
        scheduledTime: data.scheduledTime,
        reminderEnabled: data.reminderEnabled !== undefined ? data.reminderEnabled : true,
        reminderTime: data.reminderTime || '1 day',
      };

      console.log('[JOB CREATION] Job data prepared:', JSON.stringify(jobData, null, 2));

      // Step 5: Create job
      console.log('[JOB CREATION] Step 5: Creating job in database...');
      const job = await this.prisma.job.create({
        data: jobData,
        include: {
          client: { select: { id: true, name: true } },
          cleaner: { select: { id: true, email: true } },
        },
      });

      const duration = Date.now() - startTime;
      console.log('[JOB CREATION] ✅ Job created successfully!');
      console.log('[JOB CREATION] Job details:', {
        id: job.id,
        client: job.client.name,
        cleaner: job.cleaner?.email || 'Owner',
        scheduledDate: job.scheduledDate,
        status: job.status,
      });
      console.log('[JOB CREATION] Duration:', `${duration}ms`);
      console.log('='.repeat(80));

      // Step 6: Handle recurring jobs if needed
      if (data.type === JobType.RECURRING && data.frequency) {
        console.log('[JOB CREATION] Step 6: Creating recurring jobs...');
        try {
          const scheduledDate = new Date(data.scheduledDate);
          const recurringJobsData = this.jobDomainService.generateRecurringJobs(
            job,
            scheduledDate,
            data.frequency,
            12, // Create 12 future jobs
          );
          // Filter out null values and ensure proper types for Prisma
          const cleanData = recurringJobsData.map((j) => ({
            ...j,
            reminderSent: j.reminderSent ?? false,
          }));
          await this.prisma.job.createMany({ data: cleanData });
          console.log('[JOB CREATION] ✅ Created', cleanData.length, 'recurring jobs');
        } catch (recurringError) {
          console.error('[JOB CREATION] ⚠️ Error creating recurring jobs:', recurringError);
          // Don't fail the main job creation if recurring jobs fail
        }
      }

      return job;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('='.repeat(80));
      console.error('[JOB CREATION] ❌ ERROR: Job creation failed');
      console.error(
        '[JOB CREATION] Error type:',
        error instanceof Error ? error.constructor.name : typeof error,
      );
      console.error(
        '[JOB CREATION] Error message:',
        error instanceof Error ? error.message : String(error),
      );
      console.error(
        '[JOB CREATION] Error stack:',
        error instanceof Error ? error.stack : 'No stack trace',
      );
      console.error('[JOB CREATION] Context:', {
        userId,
        clientId: data.clientId,
        cleanerId: data.cleanerId,
        type: data.type,
        scheduledDate: data.scheduledDate,
        duration: `${duration}ms`,
      });
      console.error(
        '[JOB CREATION] Full error object:',
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
      );
      console.error('='.repeat(80));

      // Re-throw the error so it can be handled by the controller
      throw error;
    }
  }

  // Recurring jobs logic moved to JobDomainService.generateRecurringJobs()

  async findAll(
    userId: string,
    userRole?: string,
    pagination?: { page?: number; limit?: number },
  ): Promise<{ data: JobWithRelations[]; pagination: any } | JobWithRelations[]> {
    const startTime = Date.now();
    console.log('='.repeat(80));
    console.log('[JOBS FINDALL] Starting findAll operation');
    console.log('[JOBS FINDALL] User ID:', userId);
    console.log('[JOBS FINDALL] User Role:', userRole);
    console.log('[JOBS FINDALL] Pagination:', pagination);

    try {
      // Use getBusinessIdOrNull to gracefully handle missing business
      console.log('[JOBS FINDALL] Step 1: Getting business ID...');
      const businessId = await this.businessIdService.getBusinessIdOrNull(userId, userRole as any);

      // If no business found, return empty result
      if (!businessId) {
        console.log('[JOBS FINDALL] ⚠️ No business found, returning empty result');
        const emptyResult = pagination
          ? {
              data: [],
              pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
              },
            }
          : [];
        console.log('[JOBS FINDALL] ✅ Returning empty result');
        console.log('='.repeat(80));
        return emptyResult;
      }

      console.log('[JOBS FINDALL] ✅ Business ID found:', businessId);

      const whereClause: Prisma.JobWhereInput = { businessId };

      // Cleaners only see jobs assigned to them
      if (userRole === 'CLEANER') {
        whereClause.cleanerId = userId;
      }

      // If pagination is explicitly requested (query params provided), return paginated response
      // Check if pagination object exists and has explicit values (not just defaults)
      const hasPaginationParams =
        pagination &&
        ((pagination.page !== undefined && pagination.page !== null) ||
          (pagination.limit !== undefined && pagination.limit !== null));

      if (hasPaginationParams) {
        const page = pagination.page || 1;
        const limit = Math.min(pagination.limit || 20, 100); // Max 100 items per page
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
          this.jobsRepository.findAllWithRelations(whereClause, { skip, take: limit }),
          this.jobsRepository.count(whereClause),
        ]);

        return {
          data,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        };
      }

      // Return all results (backward compatibility) - always return as array
      console.log('[JOBS FINDALL] Step 3: Fetching all jobs...');
      const allJobs = await this.jobsRepository.findAllWithRelations(whereClause);
      const duration = Date.now() - startTime;
      console.log('[JOBS FINDALL] ✅ Successfully fetched', allJobs.length, 'jobs');
      console.log('[JOBS FINDALL] Duration:', `${duration}ms`);
      console.log('='.repeat(80));
      return allJobs;
    } catch (error) {
      const duration = Date.now() - startTime;
      // Log error for debugging
      console.error('='.repeat(80));
      console.error('[JOBS FINDALL] ❌ ERROR: Failed to fetch jobs');
      console.error(
        '[JOBS FINDALL] Error type:',
        error instanceof Error ? error.constructor.name : typeof error,
      );
      console.error(
        '[JOBS FINDALL] Error message:',
        error instanceof Error ? error.message : String(error),
      );
      console.error(
        '[JOBS FINDALL] Error stack:',
        error instanceof Error ? error.stack : 'No stack trace',
      );
      console.error('[JOBS FINDALL] Context:', {
        userId,
        userRole,
        pagination,
        duration: `${duration}ms`,
      });
      console.error(
        '[JOBS FINDALL] Full error:',
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
      );
      console.error('='.repeat(80));

      // If business doesn't exist yet or any other error, return empty array
      // Check if pagination was requested to return correct format
      const hasPaginationParams =
        pagination &&
        ((pagination.page !== undefined && pagination.page !== null) ||
          (pagination.limit !== undefined && pagination.limit !== null));

      if (hasPaginationParams) {
        return {
          data: [],
          pagination: {
            page: pagination.page || 1,
            limit: pagination.limit || 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }

      // Return empty array for backward compatibility
      return [];
    }
  }

  async findToday(userId: string, userRole?: string) {
    let businessId: string;

    if (userRole === 'CLEANER') {
      // Get cleaner's business from BusinessCleaner
      const businessCleaner = await this.prisma.businessCleaner.findFirst({
        where: {
          cleanerId: userId,
          status: 'ACTIVE',
        },
        select: {
          businessId: true,
        },
      });

      if (!businessCleaner) {
        return []; // No business assigned, return empty
      }

      businessId = businessCleaner.businessId;
    } else {
      try {
        const business = await this.businessService.findByUserId(userId);
        if (!business) {
          throw new NotFoundException('Business not found');
        }
        businessId = business.id;
      } catch (err) {
        // If business doesn't exist yet, return empty array
        if (err instanceof NotFoundException) {
          return [];
        }
        throw err;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const whereClause: Prisma.JobWhereInput = {
      businessId,
      scheduledDate: {
        gte: today,
        lt: tomorrow,
      },
    };

    // Cleaners only see their assigned jobs
    if (userRole === 'CLEANER') {
      whereClause.cleanerId = userId;
    }

    const jobs = await this.prisma.job.findMany({
      where: whereClause,
      select: {
        id: true,
        businessId: true,
        clientId: true,
        type: true,
        frequency: true,
        scheduledDate: true,
        scheduledTime: true,
        status: true,
        reminderEnabled: true,
        reminderTime: true,
        reminderSent: true,
        createdAt: true,
        updatedAt: true,
        cleanerId: true,
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // Map to JobWithRelations format
    return jobs.map((job) => ({
      ...job,
      business: { id: job.businessId, name: '' }, // Will be populated if needed
      cleaner: null, // Not needed for today's jobs list
      invoice: null, // Not needed for today's jobs list
      checklist: [],
      photos: [],
    })) as JobWithRelations[];
  }

  async findOne(userId: string, jobId: string, userRole?: string) {
    let businessId: string;

    if (userRole === 'CLEANER') {
      // Get cleaner's business from BusinessCleaner
      const businessCleaner = await this.prisma.businessCleaner.findFirst({
        where: {
          cleanerId: userId,
          status: 'ACTIVE',
        },
        select: {
          businessId: true,
        },
      });

      if (!businessCleaner) {
        throw new NotFoundException('No business assignment found');
      }

      businessId = businessCleaner.businessId;
    } else {
      const business = await this.businessService.findByUserId(userId);
      if (!business) {
        throw new NotFoundException('Business not found');
      }
      businessId = business.id;
    }

    const whereClause: Prisma.JobWhereInput = { id: jobId };

    // Cleaners can only see jobs assigned to them
    if (userRole === 'CLEANER') {
      whereClause.cleanerId = userId;
    }

    const job = await this.prisma.job.findFirst({
      where: whereClause,
      include: {
        client: true,
        checklist: true,
        photos: true,
        invoice: userRole === 'OWNER' ? true : false, // Cleaners can't see invoices
        cleaner: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.businessId !== businessId) {
      throw new ForbiddenException('Access denied');
    }

    return job;
  }

  async update(userId: string, jobId: string, data: UpdateJobDto, userRole?: string) {
    await this.findOne(userId, jobId, userRole); // Verify access

    // Cleaners can only update status, not job details
    if (userRole === 'CLEANER') {
      const { status } = data;
      return this.prisma.job.update({
        where: { id: jobId },
        data: {
          ...(status && { status: status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' }),
        },
      });
    }

    // Owners can update everything
    const updateData: Prisma.JobUpdateInput = {};

    if (data.cleanerId !== undefined) {
      if (data.cleanerId === '' || data.cleanerId === null) {
        updateData.cleaner = { disconnect: true };
      } else {
        updateData.cleaner = { connect: { id: data.cleanerId } };
      }
    }
    if (data.scheduledDate) {
      updateData.scheduledDate = new Date(data.scheduledDate);
    }
    if (data.scheduledTime !== undefined) {
      updateData.scheduledTime = data.scheduledTime;
    }
    if (data.status) {
      updateData.status = data.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
    }
    if (data.reminderEnabled !== undefined) {
      updateData.reminderEnabled = data.reminderEnabled;
      // Reset reminder sent status if reminder is re-enabled
      if (data.reminderEnabled) {
        updateData.reminderSent = false;
      }
    }
    if (data.reminderTime !== undefined) {
      updateData.reminderTime = data.reminderTime;
      // Reset reminder sent status if reminder time changes
      updateData.reminderSent = false;
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  async remove(userId: string, jobId: string, userRole?: string): Promise<JobEntity> {
    // Verify access
    const job = await this.findOne(userId, jobId, userRole);

    // Check business rule: can only delete scheduled jobs
    if (!this.jobDomainService.canDeleteJob(job.status)) {
      throw new ForbiddenException('Only scheduled jobs can be deleted');
    }

    await this.jobsRepository.delete(jobId);
    return job;
  }

  async addPhoto(
    userId: string,
    jobId: string,
    imageUrl: string,
    photoType: 'BEFORE' | 'AFTER',
    userRole?: string,
  ): Promise<JobPhotoEntity> {
    await this.findOne(userId, jobId, userRole); // Verify access

    const photo = await this.prisma.jobPhoto.create({
      data: {
        jobId,
        imageUrl,
        photoType,
      },
    });

    return {
      ...photo,
      timestamp: photo.createdAt, // Use createdAt as timestamp
    } as JobPhotoEntity;
  }

  async updateChecklistItem(
    userId: string,
    jobId: string,
    itemId: string,
    completed: boolean,
    userRole?: string,
  ): Promise<JobChecklistItemEntity> {
    await this.findOne(userId, jobId, userRole); // Verify access

    // Verify the checklist item belongs to this job
    const item = await this.prisma.jobChecklist.findUnique({
      where: { id: itemId },
    });

    if (!item || item.jobId !== jobId) {
      throw new NotFoundException('Checklist item not found');
    }

    const updated = await this.prisma.jobChecklist.update({
      where: { id: itemId },
      data: { completed },
    });

    return updated as JobChecklistItemEntity;
  }

  async getWhatsAppLinkForPhotos(
    userId: string,
    jobId: string,
    photoType: 'BEFORE' | 'AFTER' | 'ALL',
    userRole?: string,
  ) {
    const job = await this.findOne(userId, jobId, userRole);

    if (!job.client.phone) {
      return {
        whatsappUrl: null,
        phoneNumber: null,
        error: 'Client phone number not available',
      };
    }

    // Include business in the job object for message generation
    const business = await this.businessService.findByUserId(userId);
    const jobWithBusiness = {
      ...job,
      business,
    };

    const message = this.whatsappService.generateJobPhotosMessage(jobWithBusiness, photoType);
    const whatsappUrl = this.whatsappService.generateWhatsAppLink(job.client.phone, message);

    return {
      whatsappUrl,
      phoneNumber: job.client.phone,
      message,
      photos: job.photos || [],
    };
  }

  async getWhatsAppLinkForCompletion(userId: string, jobId: string, userRole?: string) {
    const job = await this.findOne(userId, jobId, userRole);

    if (!job.client.phone) {
      return {
        whatsappUrl: null,
        phoneNumber: null,
        error: 'Client phone number not available',
      };
    }

    // Include business in the job object for message generation
    const business = await this.businessService.findByUserId(userId);
    const jobWithBusiness = {
      ...job,
      business,
    };

    const message = this.whatsappService.generateJobCompletionMessage(jobWithBusiness);
    const whatsappUrl = this.whatsappService.generateWhatsAppLink(job.client.phone, message);

    return {
      whatsappUrl,
      phoneNumber: job.client.phone,
      message,
    };
  }
}
