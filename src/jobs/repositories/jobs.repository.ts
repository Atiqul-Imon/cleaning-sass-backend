import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobEntity, JobWithRelations } from '../entities/job.entity';
import { IRepository } from '../../shared/interfaces/repository.interface';
import { CreateJobDto, UpdateJobDto } from '../dto/job.dto';

/**
 * Jobs Repository
 * Data access layer for jobs
 * Implements repository pattern to separate data access from business logic
 */
@Injectable()
export class JobsRepository implements IRepository<JobEntity, any, UpdateJobDto> {
  constructor(private prisma: PrismaService) {}

  async create(data: any): Promise<JobEntity> {
    return this.prisma.job.create({
      data,
    }) as Promise<JobEntity>;
  }

  async findAll(where?: any): Promise<JobEntity[]> {
    return this.prisma.job.findMany({
      where,
      orderBy: { scheduledDate: 'desc' },
    }) as Promise<JobEntity[]>;
  }

  async findOne(id: string, where?: any): Promise<JobEntity | null> {
    return this.prisma.job.findFirst({
      where: {
        id,
        ...where,
      },
    }) as Promise<JobEntity | null>;
  }

  async findOneWithRelations(id: string, where?: any): Promise<JobWithRelations | null> {
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

  async findAllWithRelations(where?: any): Promise<JobWithRelations[]> {
    return this.prisma.job.findMany({
      where,
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
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    }) as Promise<JobWithRelations[]>;
  }

  async update(id: string, data: any): Promise<JobEntity> {
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

  async count(where?: any): Promise<number> {
    return this.prisma.job.count({
      where,
    });
  }
}

