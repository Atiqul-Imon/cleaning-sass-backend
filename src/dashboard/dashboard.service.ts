import { Injectable } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { InvoicesService } from '../invoices/invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessService } from '../business/business.service';

@Injectable()
export class DashboardService {
  constructor(
    private jobsService: JobsService,
    private invoicesService: InvoicesService,
    private prisma: PrismaService,
    private businessService: BusinessService,
  ) {}

  async getStats(userId: string, userRole?: string) {
    try {
      // Only owners see financial stats
      if (userRole === 'OWNER') {
        try {
          // Fetch business and today's jobs in parallel
          const [business, todayJobs] = await Promise.all([
            this.businessService.findByUserId(userId),
            this.jobsService.findToday(userId, userRole).catch(() => []),
          ]);

          if (!business) {
            return {
              todayJobs: todayJobs.length,
              monthlyEarnings: 0,
              unpaidInvoices: 0,
              todayJobsList: todayJobs,
              role: 'OWNER',
              recentJobs: [],
              upcomingJobs: [],
              inProgressJobs: [],
              recentClients: [],
              recentInvoices: [],
              totalJobs: 0,
              totalClients: 0,
              totalInvoices: 0,
            };
          }

          const now = new Date();
          const [unpaidCount, monthlyEarnings] = await Promise.all([
            this.invoicesService.getUnpaidCount(userId).catch(() => 0),
            this.invoicesService
              .getMonthlyEarnings(userId, now.getMonth() + 1, now.getFullYear())
              .catch(() => 0),
          ]);

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          const nextMonth = new Date(today);
          nextMonth.setDate(nextMonth.getDate() + 30); // 30 days for upcoming jobs

          // Get all data in parallel with error handling
          const [
            upcomingJobs,
            inProgressJobs,
            recentJobs,
            recentClients,
            recentInvoices,
            totalJobs,
            totalClients,
            totalInvoices,
          ] = await Promise.all([
            // Get upcoming jobs (next 30 days, including today)
            this.prisma.job
              .findMany({
                where: {
                  businessId: business.id,
                  scheduledDate: {
                    gte: today,
                    lte: nextMonth,
                  },
                  status: {
                    in: ['SCHEDULED', 'IN_PROGRESS'],
                  },
                },
                select: {
                  id: true,
                  type: true,
                  scheduledDate: true,
                  scheduledTime: true,
                  status: true,
                  client: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                    },
                  },
                  cleaner: {
                    select: {
                      id: true,
                      email: true,
                    },
                  },
                },
                orderBy: {
                  scheduledDate: 'asc',
                },
                take: 10,
              })
              .catch(() => []),
            // Get in-progress jobs
            this.prisma.job
              .findMany({
                where: {
                  businessId: business.id,
                  status: 'IN_PROGRESS',
                },
                select: {
                  id: true,
                  type: true,
                  scheduledDate: true,
                  scheduledTime: true,
                  status: true,
                  client: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                    },
                  },
                  cleaner: {
                    select: {
                      id: true,
                      email: true,
                    },
                  },
                },
                orderBy: {
                  scheduledDate: 'asc',
                },
                take: 10,
              })
              .catch(() => []),
            // Get recent jobs (last 10, excluding today's)
            this.prisma.job
              .findMany({
                where: {
                  businessId: business.id,
                  scheduledDate: {
                    lt: today,
                  },
                },
                select: {
                  id: true,
                  type: true,
                  scheduledDate: true,
                  scheduledTime: true,
                  status: true,
                  client: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                    },
                  },
                  cleaner: {
                    select: {
                      id: true,
                      email: true,
                    },
                  },
                },
                orderBy: {
                  scheduledDate: 'desc',
                },
                take: 10,
              })
              .catch(() => []),
            // Get recent clients (last 5)
            this.prisma.client
              .findMany({
                where: {
                  businessId: business.id,
                },
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  address: true,
                  createdAt: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
                take: 5,
              })
              .catch(() => []),
            // Get recent invoices (last 5)
            this.prisma.invoice
              .findMany({
                where: {
                  businessId: business.id,
                },
                select: {
                  id: true,
                  invoiceNumber: true,
                  totalAmount: true,
                  status: true,
                  createdAt: true,
                  dueDate: true,
                  client: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: 'desc',
                },
                take: 5,
              })
              .catch(() => []),
            // Get total counts
            this.prisma.job
              .count({
                where: { businessId: business.id },
              })
              .catch(() => 0),
            this.prisma.client
              .count({
                where: { businessId: business.id },
              })
              .catch(() => 0),
            this.prisma.invoice
              .count({
                where: { businessId: business.id },
              })
              .catch(() => 0),
          ]);

          return {
            todayJobs: todayJobs.length,
            monthlyEarnings,
            unpaidInvoices: unpaidCount,
            todayJobsList: todayJobs,
            role: 'OWNER',
            recentJobs,
            upcomingJobs,
            inProgressJobs,
            recentClients,
            recentInvoices,
            totalJobs,
            totalClients,
            totalInvoices,
          };
        } catch (error) {
          console.error('Error fetching owner dashboard stats:', error);
          // Return minimal data on error
          return {
            todayJobs: 0,
            monthlyEarnings: 0,
            unpaidInvoices: 0,
            todayJobsList: [],
            role: 'OWNER',
            recentJobs: [],
            upcomingJobs: [],
            inProgressJobs: [],
            recentClients: [],
            recentInvoices: [],
            totalJobs: 0,
            totalClients: 0,
            totalInvoices: 0,
          };
        }
      }

      // Cleaners see limited stats + business info
      if (userRole === 'CLEANER') {
        // Get cleaner's businesses and today's jobs in parallel
        const [businessCleaners, todayJobs] = await Promise.all([
          this.prisma.businessCleaner.findMany({
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
          }),
          this.jobsService.findToday(userId, userRole).catch(() => []),
        ]);

        const businesses = businessCleaners.map((bc) => bc.business);

        if (businessCleaners.length > 0) {
          const businessId = businessCleaners[0].businessId;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          const weekStart = new Date(today);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());

          // Get all cleaner data in parallel
          const [upcomingJobs, inProgressJobs, completedThisWeek] = await Promise.all([
            this.prisma.job.findMany({
              where: {
                businessId,
                cleanerId: userId,
                scheduledDate: {
                  gte: today,
                  lte: nextWeek,
                },
                status: {
                  in: ['SCHEDULED', 'IN_PROGRESS'],
                },
              },
              select: {
                id: true,
                type: true,
                scheduledDate: true,
                scheduledTime: true,
                status: true,
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
              take: 5,
            }),
            this.prisma.job.findMany({
              where: {
                businessId,
                cleanerId: userId,
                status: 'IN_PROGRESS',
              },
              select: {
                id: true,
                type: true,
                scheduledDate: true,
                scheduledTime: true,
                status: true,
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
            }),
            this.prisma.job.count({
              where: {
                businessId,
                cleanerId: userId,
                status: 'COMPLETED',
                updatedAt: {
                  gte: weekStart,
                },
              },
            }),
          ]);

          return {
            todayJobs: todayJobs.length,
            monthlyEarnings: 0,
            unpaidInvoices: 0,
            todayJobsList: todayJobs,
            role: 'CLEANER',
            businesses,
            upcomingJobs,
            inProgressJobs,
            completedThisWeek,
          };
        }

        return {
          todayJobs: todayJobs.length,
          monthlyEarnings: 0,
          unpaidInvoices: 0,
          todayJobsList: todayJobs,
          role: 'CLEANER',
          businesses,
          upcomingJobs: [],
          inProgressJobs: [],
          completedThisWeek: 0,
        };
      }

      // Fallback for non-OWNER, non-CLEANER roles
      const todayJobs = await this.jobsService.findToday(userId, userRole).catch(() => []);
      return {
        todayJobs: todayJobs.length,
        monthlyEarnings: 0,
        unpaidInvoices: 0,
        todayJobsList: todayJobs,
        role: userRole || 'OWNER',
        recentJobs: [],
        upcomingJobs: [],
        inProgressJobs: [],
        recentClients: [],
        recentInvoices: [],
        totalJobs: 0,
        totalClients: 0,
        totalInvoices: 0,
      };
    } catch (error) {
      console.error('Error in dashboard getStats:', error);
      // Return minimal safe data on error
      return {
        todayJobs: 0,
        monthlyEarnings: 0,
        unpaidInvoices: 0,
        todayJobsList: [],
        role: userRole || 'OWNER',
        recentJobs: [],
        upcomingJobs: [],
        inProgressJobs: [],
        recentClients: [],
        recentInvoices: [],
        totalJobs: 0,
        totalClients: 0,
        totalInvoices: 0,
      };
    }
  }
}
