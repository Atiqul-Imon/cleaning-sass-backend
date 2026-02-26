import { Injectable, NotFoundException } from '@nestjs/common';
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
              trialStartedAt: true,
              trialEndsAt: true,
              payoneerEmail: true,
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

  async getSubscriptions(filters?: { status?: string; planType?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.planType) {
      where.planType = filters.planType;
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return subscriptions;
  }

  async getSubscriptionByBusinessId(businessId: string) {
    return this.prisma.subscription.findUnique({
      where: { businessId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async updateSubscription(
    businessId: string,
    data: {
      planType?: 'SOLO' | 'TEAM' | 'BUSINESS';
      status?: 'TRIALING' | 'ACTIVE' | 'CANCELLED' | 'PAST_DUE';
      currentPeriodEnd?: Date;
      payoneerEmail?: string;
      adminNotes?: string;
      paymentMethod?: string;
    },
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const updateData: Record<string, unknown> = {};
    if (data.planType !== undefined) {
      updateData.planType = data.planType;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.currentPeriodEnd !== undefined) {
      updateData.currentPeriodEnd = data.currentPeriodEnd;
    }
    if (data.payoneerEmail !== undefined) {
      updateData.payoneerEmail = data.payoneerEmail;
    }
    if (data.adminNotes !== undefined) {
      updateData.adminNotes = data.adminNotes;
    }
    if (data.paymentMethod !== undefined) {
      updateData.paymentMethod = data.paymentMethod;
    }

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: updateData,
    });
  }

  async extendSubscription(businessId: string, months: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const newEnd = new Date(subscription.currentPeriodEnd);
    newEnd.setMonth(newEnd.getMonth() + months);

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { currentPeriodEnd: newEnd },
    });
  }

  async recordPayment(
    businessId: string,
    data: {
      planType: 'SOLO' | 'TEAM' | 'BUSINESS';
      months?: number;
      payoneerEmail?: string;
      adminNotes?: string;
    },
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const months = data.months ?? 1;
    const newEnd = new Date();
    newEnd.setMonth(newEnd.getMonth() + months);

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planType: data.planType,
        status: 'ACTIVE',
        currentPeriodEnd: newEnd,
        paymentMethod: 'PAYONEER',
        payoneerEmail: data.payoneerEmail ?? subscription.payoneerEmail,
        adminNotes: data.adminNotes ?? subscription.adminNotes,
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
