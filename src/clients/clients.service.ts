import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessService } from '../business/business.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private businessService: BusinessService,
  ) {}

  async create(userId: string, data: CreateClientDto) {
    const business = await this.businessService.findByUserId(userId);

    return this.prisma.client.create({
      data: {
        businessId: business.id,
        ...data,
      },
    });
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
    } else {
      const business = await this.businessService.findByUserId(userId);
      businessId = business.id;
    }

    return this.prisma.client.findMany({
      where: { businessId: businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, clientId: string, userRole?: string) {
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

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        jobs: {
          orderBy: { scheduledDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (client.businessId !== businessId) {
      throw new ForbiddenException('Access denied');
    }

    return client;
  }

  async update(userId: string, clientId: string, data: UpdateClientDto, userRole?: string) {
    await this.findOne(userId, clientId, userRole); // Verify access

    return this.prisma.client.update({
      where: { id: clientId },
      data,
    });
  }

  async remove(userId: string, clientId: string, userRole?: string) {
    await this.findOne(userId, clientId, userRole); // Verify access

    return this.prisma.client.delete({
      where: { id: clientId },
    });
  }

  async getJobHistory(userId: string, clientId: string, userRole?: string) {
    await this.findOne(userId, clientId, userRole); // Verify access

    const whereClause: any = { clientId };

    // Cleaners only see their assigned jobs for this client
    if (userRole === 'CLEANER') {
      whereClause.cleanerId = userId;
    }

    return this.prisma.job.findMany({
      where: whereClause,
      orderBy: { scheduledDate: 'desc' },
      include: {
        invoice: userRole === 'OWNER' ? true : false, // Cleaners can't see invoices
      },
    });
  }
}

