import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalBusinesses,
      totalUsers,
      totalJobs,
      totalInvoices,
      activeSubscriptions,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.business.count(),
      this.prisma.user.count(),
      this.prisma.job.count(),
      this.prisma.invoice.count(),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    // Get businesses by plan
    const businessesByPlan = await this.prisma.subscription.groupBy({
      by: ['planType'],
      _count: {
        planType: true,
      },
    });

    // Get recent businesses (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBusinesses = await this.prisma.business.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return {
      totalBusinesses,
      totalUsers,
      totalJobs,
      totalInvoices,
      activeSubscriptions,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      recentBusinesses,
      businessesByPlan: businessesByPlan.map((item) => ({
        plan: item.planType,
        count: item._count.planType,
      })),
    };
  }

  async getAllBusinesses(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [businesses, total] = await Promise.all([
      this.prisma.business.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
          subscription: {
            select: {
              planType: true,
              status: true,
              currentPeriodEnd: true,
            },
          },
          _count: {
            select: {
              clients: true,
              jobs: true,
              invoices: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.business.count(),
    ]);

    return {
      businesses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBusinessDetails(businessId: string) {
    return this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        subscription: true,
        clients: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        jobs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
              select: {
                name: true,
              },
            },
          },
        },
        invoices: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            clients: true,
            jobs: true,
            invoices: true,
          },
        },
      },
    });
  }

  async getAllUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        include: {
          business: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              assignedJobs: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
