import {
  Injectable,
  NotFoundException,
  Optional,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class BusinessService {
  constructor(
    private prisma: PrismaService,
    @Optional() private cacheService?: CacheService,
  ) {}

  async create(userId: string, data: CreateBusinessDto) {
    try {
      // Check if business already exists
      const existingBusiness = await this.prisma.business.findUnique({
        where: { userId },
      });

      if (existingBusiness) {
        throw new ConflictException('Business already exists for this user');
      }

      // User should already exist from signup
      // If not, this will be caught by the database foreign key constraint

      const business = await this.prisma.business.create({
        data: {
          userId,
          invoiceTemplate: data.invoiceTemplate || 'classic',
          name: data.name,
          phone: data.phone,
          address: data.address,
          vatEnabled: data.vatEnabled || false,
          vatNumber: data.vatNumber,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return business;
    } catch (error: any) {
      // If it's already an HttpException, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle Prisma unique constraint errors
      if (error.code === 'P2002') {
        throw new ConflictException('Business already exists for this user');
      }

      // Handle Prisma foreign key constraint errors (user doesn't exist)
      if (error.code === 'P2003') {
        throw new NotFoundException('User not found. Please ensure you are properly registered.');
      }

      // Log the error for debugging
      console.error('Error creating business:', error);

      // Re-throw as a more descriptive error
      throw new HttpException(
        `Failed to create business: ${error.message || 'Unknown error'}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByUserId(userId: string): Promise<Prisma.BusinessGetPayload<{
    include: { user: { select: { id: true; email: true; role: true } } };
  }> | null> {
    try {
      // Check cache first (request-scoped)
      const cacheKey = `business:userId:${userId}`;
      if (this.cacheService?.has(cacheKey)) {
        const cached = this.cacheService.get<
          Prisma.BusinessGetPayload<{
            include: { user: { select: { id: true; email: true; role: true } } };
          }>
        >(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const business = await this.prisma.business.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!business) {
        return null;
      }

      // Cache the result for this request
      this.cacheService?.set(cacheKey, business);

      return business;
    } catch (error: any) {
      // Log the error for debugging
      console.error('Error in findByUserId:', error);
      // Re-throw as a more descriptive error
      throw new Error(`Failed to fetch business: ${error.message || 'Unknown error'}`);
    }
  }

  async update(userId: string, data: UpdateBusinessDto) {
    const business = await this.findByUserId(userId);

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return this.prisma.business.update({
      where: { id: business.id },
      data,
    });
  }

  async toggleVat(userId: string, vatEnabled: boolean, vatNumber?: string) {
    const business = await this.findByUserId(userId);

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return this.prisma.business.update({
      where: { id: business.id },
      data: {
        vatEnabled,
        vatNumber: vatEnabled ? vatNumber : null,
      },
    });
  }

  async getCleaners(userId: string) {
    const business = await this.findByUserId(userId);

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Get all cleaners linked to this business via BusinessCleaner
    const businessCleaners = await this.prisma.businessCleaner.findMany({
      where: {
        businessId: business.id,
      },
      include: {
        cleaner: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (businessCleaners.length === 0) {
      return [];
    }

    // Get all cleaner IDs
    const cleanerIds = businessCleaners.map((bc) => bc.cleanerId);

    // Calculate today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total job counts for all cleaners in a single query using raw SQL for aggregation
    const totalJobCounts = await this.prisma.$queryRaw<Array<{ cleanerId: string; count: bigint }>>`
      SELECT "cleaner_id" as "cleanerId", COUNT(*)::bigint as count
      FROM "jobs"
      WHERE "business_id" = ${business.id}
        AND "cleaner_id" IN (${Prisma.join(cleanerIds)})
      GROUP BY "cleaner_id"
    `;

    // Get today's job counts for all cleaners in a single query
    const todayJobCounts = await this.prisma.$queryRaw<Array<{ cleanerId: string; count: bigint }>>`
      SELECT "cleaner_id" as "cleanerId", COUNT(*)::bigint as count
      FROM "jobs"
      WHERE "business_id" = ${business.id}
        AND "cleaner_id" IN (${Prisma.join(cleanerIds)})
        AND "scheduled_date" >= ${today}
        AND "scheduled_date" < ${tomorrow}
      GROUP BY "cleaner_id"
    `;

    // Create maps for quick lookup
    const totalJobsMap = new Map(
      totalJobCounts.map((item) => [item.cleanerId, Number(item.count)]),
    );
    const todayJobsMap = new Map(
      todayJobCounts.map((item) => [item.cleanerId, Number(item.count)]),
    );

    // Combine data
    return businessCleaners.map((bc) => ({
      id: bc.id,
      cleanerId: bc.cleanerId,
      email: bc.cleaner.email,
      role: bc.cleaner.role,
      status: bc.status,
      totalJobs: totalJobsMap.get(bc.cleanerId) || 0,
      todayJobs: todayJobsMap.get(bc.cleanerId) || 0,
      createdAt: bc.createdAt,
      activatedAt: bc.activatedAt,
    }));
  }
}
