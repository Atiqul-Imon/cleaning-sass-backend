import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { JobEntity, JobWithRelations } from '../entities/job.entity';
import { IRepository } from '../../shared/interfaces/repository.interface';
import { CreateJobDto, UpdateJobDto } from '../dto/job.dto';

/**
 * Jobs Repository
 * Data access layer for jobs
 * Implements repository pattern to separate data access from business logic
 */
@Injectable()
export class JobsRepository implements IRepository<
  JobEntity,
  CreateJobDto & { businessId: string },
  UpdateJobDto,
  Prisma.JobWhereInput
> {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateJobDto & { businessId: string }): Promise<JobEntity> {
    return this.prisma.job.create({
      data,
    }) as Promise<JobEntity>;
  }

  async findAll(where?: Prisma.JobWhereInput): Promise<JobEntity[]> {
    return this.prisma.job.findMany({
      where,
      orderBy: { scheduledDate: 'desc' },
    }) as Promise<JobEntity[]>;
  }

  async findOne(id: string, where?: Prisma.JobWhereInput): Promise<JobEntity | null> {
    return this.prisma.job.findFirst({
      where: {
        id,
        ...where,
      },
    }) as Promise<JobEntity | null>;
  }

  async findOneWithRelations(
    id: string,
    where?: Prisma.JobWhereInput,
  ): Promise<JobWithRelations | null> {
    return this.prisma.job.findFirst({
      where: {
        id,
        ...where,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
        cleaner: {
          select: {
            id: true,
            email: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        checklist: {
          select: {
            id: true,
            itemText: true,
            completed: true,
          },
        },
        photos: {
          select: {
            id: true,
            imageUrl: true,
            photoType: true,
            timestamp: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
    }) as Promise<JobWithRelations | null>;
  }

  async findAllWithRelations(
    where?: Prisma.JobWhereInput,
    pagination?: { skip?: number; take?: number },
  ): Promise<JobWithRelations[]> {
    return this.prisma.job.findMany({
      where,
      select: {
        id: true,
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
        cleaner: {
          select: {
            id: true,
            email: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
      ...(pagination && { skip: pagination.skip, take: pagination.take }),
    }) as Promise<JobWithRelations[]>;
  }

  async update(id: string, data: Prisma.JobUpdateInput): Promise<JobEntity> {
    return this.prisma.job.update({
      where: { id },
      data,
    }) as Promise<JobEntity>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.job.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.JobWhereInput): Promise<number> {
    return this.prisma.job.count({
      where,
    });
  }
}
