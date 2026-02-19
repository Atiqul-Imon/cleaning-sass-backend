import { Injectable } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { InvoicesService } from '../invoices/invoices.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private jobsService: JobsService,
    private invoicesService: InvoicesService,
    private prisma: PrismaService,
  ) {}

  async getStats(userId: string, userRole?: string) {
    const todayJobs = await this.jobsService.findToday(userId, userRole);

    // Only owners see financial stats
    if (userRole === 'OWNER') {
      const unpaidCount = await this.invoicesService.getUnpaidCount(userId);

      const now = new Date();
      const monthlyEarnings = await this.invoicesService.getMonthlyEarnings(
        userId,
        now.getMonth() + 1,
        now.getFullYear(),
      );

      return {
        todayJobs: todayJobs.length,
        monthlyEarnings,
        unpaidInvoices: unpaidCount,
        todayJobsList: todayJobs,
        role: 'OWNER',
      };
    }

    // Cleaners see limited stats + business info
    let businesses: any[] = [];
    let upcomingJobs: any[] = [];
    let inProgressJobs: any[] = [];
    let completedThisWeek: number = 0;

    if (userRole === 'CLEANER') {
      // Get cleaner's business from BusinessCleaner
      const businessCleaners = await this.prisma.businessCleaner.findMany({
        where: {
          cleanerId: userId,
          status: 'ACTIVE',
        },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
            },
          },
        },
      });

      businesses = businessCleaners.map((bc) => bc.business);

      if (businessCleaners.length > 0) {
        const businessId = businessCleaners[0].businessId;

        // Get upcoming jobs (next 7 days)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        upcomingJobs = await this.prisma.job.findMany({
          where: {
            businessId,
            cleanerId: userId,
            scheduledDate: {
              gte: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
              lte: nextWeek,
            },
            status: {
              in: ['SCHEDULED', 'IN_PROGRESS'],
            },
          },
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            scheduledDate: 'asc',
          },
          take: 5, // Limit to 5 upcoming jobs
        });

        // Get in-progress jobs
        inProgressJobs = await this.prisma.job.findMany({
          where: {
            businessId,
            cleanerId: userId,
            status: 'IN_PROGRESS',
          },
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            scheduledDate: 'asc',
          },
        });

        // Get completed jobs this week
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

        completedThisWeek = await this.prisma.job.count({
          where: {
            businessId,
            cleanerId: userId,
            status: 'COMPLETED',
            updatedAt: {
              gte: weekStart,
            },
          },
        });
      }
    }

    return {
      todayJobs: todayJobs.length,
      monthlyEarnings: 0,
      unpaidInvoices: 0,
      todayJobsList: todayJobs,
      role: 'CLEANER',
      businesses, // Business(es) the cleaner works for
      upcomingJobs, // Next 7 days jobs
      inProgressJobs, // Currently in progress
      completedThisWeek, // Completed this week count
    };
  }
}
