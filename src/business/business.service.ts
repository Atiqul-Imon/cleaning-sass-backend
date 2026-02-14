import { Injectable, NotFoundException, Optional } from '@nestjs/common';
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
    // First ensure user exists
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: '', // Will be updated from auth
        role: 'OWNER',
      },
    });

    return this.prisma.business.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  async findByUserId(userId: string) {
    // Check cache first (request-scoped)
    const cacheKey = `business:userId:${userId}`;
    if (this.cacheService?.has(cacheKey)) {
      const cached = this.cacheService.get(cacheKey) as Awaited<ReturnType<typeof this.findByUserId>>;
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
      throw new NotFoundException('Business not found');
    }

    // Cache the result for this request
    this.cacheService?.set(cacheKey, business);

    return business;
  }

  async update(userId: string, data: UpdateBusinessDto) {
    const business = await this.findByUserId(userId);

    return this.prisma.business.update({
      where: { id: business.id },
      data,
    });
  }

  async toggleVat(userId: string, vatEnabled: boolean, vatNumber?: string) {
    const business = await this.findByUserId(userId);

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


