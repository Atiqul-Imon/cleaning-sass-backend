import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessService } from '../business/business.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { addWeeks, addDays } from 'date-fns';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private businessService: BusinessService,
  ) {}

  async create(userId: string, data: CreateJobDto) {
    const business = await this.businessService.findByUserId(userId);
    const scheduledDate = new Date(data.scheduledDate);

    const job = await this.prisma.job.create({
      data: {
        businessId: business.id,
        clientId: data.clientId,
        cleanerId: data.cleanerId,
        type: data.type,
        frequency: data.frequency,
        scheduledDate,
        scheduledTime: data.scheduledTime,
      },
    });

    // If recurring, create future jobs
    if (data.type === 'RECURRING' && data.frequency) {
      await this.createRecurringJobs(job.id, scheduledDate, data.frequency, 12); // Create 12 future jobs
    }

    return job;
  }

  private async createRecurringJobs(
    originalJobId: string,
    startDate: Date,
    frequency: 'WEEKLY' | 'BI_WEEKLY',
    count: number,
  ) {
    const originalJob = await this.prisma.job.findUnique({
      where: { id: originalJobId },
    });

    if (!originalJob) return;

    const jobs: Array<{
      businessId: string;
      clientId: string;
      cleanerId: string | null;
      type: 'RECURRING';
      frequency: 'WEEKLY' | 'BI_WEEKLY';
      scheduledDate: Date;
      scheduledTime: string | null;
      status: 'SCHEDULED';
    }> = [];
    
    for (let i = 1; i <= count; i++) {
      const nextDate =
        frequency === 'WEEKLY'
          ? addWeeks(startDate, i)
          : addWeeks(startDate, i * 2);

      jobs.push({
        businessId: originalJob.businessId,
        clientId: originalJob.clientId,
        cleanerId: originalJob.cleanerId,
        type: 'RECURRING',
        frequency,
        scheduledDate: nextDate,
        scheduledTime: originalJob.scheduledTime,
        status: 'SCHEDULED',
      });
    }

    await this.prisma.job.createMany({ data: jobs });
  }

  async findAll(userId: string, userRole?: string) {
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

      // Cleaners only see jobs assigned to them
      return this.prisma.job.findMany({
        where: {
          businessId: businessId,
          cleanerId: userId, // Only jobs assigned to this cleaner
        },
        include: {
          client: true,
        },
        orderBy: { scheduledDate: 'desc' },
      });
    }

    // Owners see all jobs
    const business = await this.businessService.findByUserId(userId);
    return this.prisma.job.findMany({
      where: { businessId: business.id },
      include: {
        client: true,
        invoice: true,
      },
      orderBy: { scheduledDate: 'desc' },
    });
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
      const business = await this.businessService.findByUserId(userId);
      businessId = business.id;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const whereClause: any = {
      businessId: businessId,
      scheduledDate: {
        gte: today,
        lt: tomorrow,
      },
    };

    // Cleaners only see their assigned jobs
    if (userRole === 'CLEANER') {
      whereClause.cleanerId = userId;
    }

    return this.prisma.job.findMany({
      where: whereClause,
      include: {
        client: true,
      },
      orderBy: { scheduledTime: 'asc' },
    });
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
      businessId = business.id;
    }

    const whereClause: any = { id: jobId };

    // Cleaners can only see jobs assigned to them
    if (userRole === 'CLEANER') {
      whereClause.cleanerId = userId;
    }

    const job = await this.prisma.job.findUnique({
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

  async update(
    userId: string,
    jobId: string,
    data: UpdateJobDto,
    userRole?: string,
  ) {
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
    const updateData: any = {};
    
    if (data.cleanerId !== undefined) updateData.cleanerId = data.cleanerId;
    if (data.scheduledDate) updateData.scheduledDate = new Date(data.scheduledDate);
    if (data.scheduledTime !== undefined) updateData.scheduledTime = data.scheduledTime;
    if (data.status) updateData.status = data.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

    return this.prisma.job.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  async remove(userId: string, jobId: string, userRole?: string) {
    await this.findOne(userId, jobId, userRole); // Verify access

    return this.prisma.job.delete({
      where: { id: jobId },
    });
  }

  async addPhoto(
    userId: string,
    jobId: string,
    imageUrl: string,
    photoType: 'BEFORE' | 'AFTER',
    userRole?: string,
  ) {
    await this.findOne(userId, jobId, userRole); // Verify access

    return this.prisma.jobPhoto.create({
      data: {
        jobId,
        imageUrl,
        photoType,
      },
    });
  }

  async updateChecklistItem(
    userId: string,
    jobId: string,
    itemId: string,
    completed: boolean,
    userRole?: string,
  ) {
    await this.findOne(userId, jobId, userRole); // Verify access

    // Verify the checklist item belongs to this job
    const item = await this.prisma.jobChecklist.findUnique({
      where: { id: itemId },
    });

    if (!item || item.jobId !== jobId) {
      throw new NotFoundException('Checklist item not found');
    }

    return this.prisma.jobChecklist.update({
      where: { id: itemId },
      data: { completed },
    });
  }
}

