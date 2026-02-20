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
    let todayJobs: any[] = [];
    try {
      todayJobs = await this.jobsService.findToday(userId, userRole);

      // Only owners see financial stats
      if (userRole === 'OWNER') {
        try {
          const business = await this.businessService.findByUserId(userId);
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

          const [unpaidCount, monthlyEarnings] = await Promise.all([
            this.invoicesService.getUnpaidCount(userId).catch(() => 0),
            (async () => {
              const now = new Date();
              return this.invoicesService
                .getMonthlyEarnings(userId, now.getMonth() + 1, now.getFullYear())
                .catch(() => 0);
            })(),
          ]);

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);

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
            // Get upcoming jobs (next 7 days)
            this.prisma.job
              .findMany({
                where: {
                  businessId: business.id,
                  scheduledDate: {
                    gte: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
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
            take: 5, // Limit to 5 upcoming jobs
          });

          // Get in-progress jobs
          inProgressJobs = await this.prisma.job.findMany({
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
        role: userRole === 'CLEANER' ? 'CLEANER' : 'OWNER',
        businesses, // Business(es) the cleaner works for
        upcomingJobs, // Next 7 days jobs
        inProgressJobs, // Currently in progress
        completedThisWeek, // Completed this week count
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
