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
import { CacheService } from '../cache/cache.service';

@Injectable()
export class JobsService implements IJobsService {
  constructor(
    private prisma: PrismaService,
    private jobsRepository: JobsRepository,
    private businessService: BusinessService,
    private whatsappService: WhatsAppService,
    private jobDomainService: JobDomainService,
    private businessIdService: BusinessIdDomainService,
    private cacheService: CacheService,
  ) {}

  async create(userId: string, data: CreateJobDto) {
    let cleanerId: string | undefined;
    try {
      const business = await this.businessService.findByUserId(userId);
      if (!business) {
        throw new NotFoundException('Business not found. Please complete business setup first.');
      }

      const client = await this.prisma.client.findUnique({
        where: { id: data.clientId },
        select: { id: true, name: true, businessId: true },
      });

      if (!client) {
        throw new NotFoundException(`Client with ID ${data.clientId} not found`);
      }

      if (client.businessId !== business.id) {
        throw new ForbiddenException('Client does not belong to your business');
      }

      cleanerId = data.cleanerId;
      if (!cleanerId) {
        cleanerId = userId;
      } else {
        const cleaner = await this.prisma.user.findUnique({
          where: { id: cleanerId },
          select: { id: true, email: true, role: true },
        });

        if (!cleaner) {
          throw new NotFoundException(`Cleaner with ID ${cleanerId} not found`);
        }

        const businessCleaner = await this.prisma.businessCleaner.findFirst({
          where: {
            cleanerId,
            businessId: business.id,
            status: 'ACTIVE',
          },
        });

        if (!businessCleaner && cleaner.role !== 'OWNER') {
          throw new ForbiddenException('Cleaner is not assigned to your business');
        }
      }

      const scheduledDate = new Date(data.scheduledDate);
      if (isNaN(scheduledDate.getTime())) {
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

      const job = await this.prisma.job.create({
        data: jobData,
        include: {
          client: { select: { id: true, name: true } },
          cleaner: { select: { id: true, email: true, name: true } },
        },
      });

      if (data.type === JobType.RECURRING && data.frequency) {
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
        } catch {
          // Don't fail the main job creation if recurring jobs fail
        }
      }

      return job;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(
          '[JOB CREATION] Error:',
          error instanceof Error ? error.message : String(error),
        );
      }
      throw error;
    } finally {
      // Invalidate dashboard cache after job creation
      try {
        const business = await this.businessService.findByUserId(userId);
        if (business) {
          await this.cacheService.del(`dashboard:${userId}:OWNER`);
          // Also invalidate cleaner's cache if assigned
          if (cleanerId && cleanerId !== userId) {
            await this.cacheService.del(`dashboard:${cleanerId}:CLEANER`);
          }
        }
      } catch {
        // Cache invalidation failure shouldn't break job creation
      }
    }
  }

  // Recurring jobs logic moved to JobDomainService.generateRecurringJobs()

  async findAll(
    userId: string,
    userRole?: 'OWNER' | 'CLEANER' | 'ADMIN',
    pagination?: { page?: number; limit?: number },
  ): Promise<
    { data: JobWithRelations[]; pagination?: Record<string, unknown> } | JobWithRelations[]
  > {
    try {
      const businessId = await this.businessIdService.getBusinessIdOrNull(userId, userRole);

      if (!businessId) {
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
        return emptyResult;
      }

      const whereClause: Prisma.JobWhereInput = { businessId };

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

      const allJobs = await this.jobsRepository.findAllWithRelations(whereClause);
      return { data: allJobs };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(
          '[JOBS FINDALL] Error:',
          error instanceof Error ? error.message : String(error),
        );
      }
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

      // Return empty list shape for consistency
      return { data: [] };
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

    // Use UTC to match how scheduledDate is stored (YYYY-MM-DD -> UTC midnight)
    // Avoids timezone mismatch where server local "today" excludes jobs
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    const whereClause: Prisma.JobWhereInput = {
      businessId,
      scheduledDate: {
        gte: todayStart,
        lt: todayEnd,
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
            name: true,
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
      const updatedJob = await this.prisma.job.update({
        where: { id: jobId },
        data: {
          ...(status && { status: status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' }),
        },
        include: {
          client: { select: { id: true, name: true } },
          cleaner: { select: { id: true, email: true, name: true } },
        },
      });

      // Invalidate cleaner's cache after status update
      try {
        await this.cacheService.del(`dashboard:${userId}:CLEANER`);
      } catch {
        // Cache invalidation failure shouldn't break job update
      }

      return updatedJob;
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

    const updatedJob = await this.prisma.job.update({
      where: { id: jobId },
      data: updateData,
      include: {
        client: { select: { id: true, name: true } },
        cleaner: { select: { id: true, email: true, name: true } },
      },
    });

    // Invalidate cache after update
    try {
      await this.cacheService.del(`dashboard:${userId}:${userRole || 'OWNER'}`);
      if (updatedJob.cleanerId && updatedJob.cleanerId !== userId) {
        await this.cacheService.del(`dashboard:${updatedJob.cleanerId}:CLEANER`);
      }
    } catch {
      // Cache invalidation failure shouldn't break job update
    }

    return updatedJob;
  }

  async remove(userId: string, jobId: string, userRole?: string): Promise<JobEntity> {
    // Verify access
    const job = await this.findOne(userId, jobId, userRole);

    // Check business rule: can only delete scheduled jobs
    if (!this.jobDomainService.canDeleteJob(job.status)) {
      throw new ForbiddenException('Only scheduled jobs can be deleted');
    }

    await this.jobsRepository.delete(jobId);

    // Invalidate cache after deletion
    try {
      await this.cacheService.del(`dashboard:${userId}:${userRole || 'OWNER'}`);
      if (job.cleanerId && job.cleanerId !== userId) {
        await this.cacheService.del(`dashboard:${job.cleanerId}:CLEANER`);
      }
    } catch {
      // Cache invalidation failure shouldn't break job deletion
    }

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

  async getPhotosForDownload(userId: string, jobId: string, userRole?: string) {
    const job = await this.findOne(userId, jobId, userRole);

    // Return photos with full URLs
    return job.photos || [];
  }
}
