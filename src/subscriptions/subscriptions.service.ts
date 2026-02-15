import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessService } from '../business/business.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private businessService: BusinessService,
  ) {}

  async getSubscription(userId: string) {
    const business = await this.businessService.findByUserId(userId);

    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId: business.id },
      include: {
        usage: {
          orderBy: [
            { year: 'desc' },
            { month: 'desc' },
          ],
          take: 12, // Last 12 months
        },
      },
    });

    if (!subscription) {
      // Create default FREE subscription if none exists
      return this.createDefaultSubscription(business.id);
    }

    return subscription;
  }

  async createDefaultSubscription(businessId: string) {
    const subscription = await this.prisma.subscription.create({
      data: {
        businessId,
        planType: 'FREE',
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return subscription;
  }

  async updateSubscription(
    userId: string,
    planType: 'FREE' | 'SOLO' | 'SMALL_TEAM',
    stripeSubscriptionId?: string,
  ) {
    const business = await this.businessService.findByUserId(userId);

    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId: business.id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planType,
        stripeSubscriptionId,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
  }

  async cancelSubscription(userId: string) {
    const business = await this.businessService.findByUserId(userId);

    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId: business.id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  async trackJobUsage(businessId: string) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
    });

    if (!subscription) {
      return; // No subscription, can't track
    }

    // Find or create usage record for this month
    const usage = await this.prisma.jobUsage.upsert({
      where: {
        businessId_month_year: {
          businessId,
          month,
          year,
        },
      },
      update: {
        jobCount: {
          increment: 1,
        },
      },
      create: {
        businessId,
        subscriptionId: subscription.id,
        month,
        year,
        jobCount: 1,
      },
    });

    return usage;
  }

  async getUsageStats(userId: string) {
    const business = await this.businessService.findByUserId(userId);

    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId: business.id },
      include: {
        usage: {
          orderBy: [
            { year: 'desc' },
            { month: 'desc' },
          ],
          take: 12,
        },
      },
    });

    if (!subscription) {
      return {
        currentPlan: 'FREE',
        status: 'ACTIVE',
        usage: [],
        monthlyLimit: this.getPlanLimit('FREE'),
      };
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const currentUsage = subscription.usage.find(
      (u) => u.month === currentMonth && u.year === currentYear,
    );

    return {
      currentPlan: subscription.planType,
      status: subscription.status,
      currentMonthUsage: currentUsage?.jobCount || 0,
      monthlyLimit: this.getPlanLimit(subscription.planType),
      usage: subscription.usage,
    };
  }

  private getPlanLimit(planType: string): number {
    switch (planType) {
      case 'FREE':
        return 10; // 10 jobs per month
      case 'SOLO':
        return 50; // 50 jobs per month
      case 'SMALL_TEAM':
        return 200; // 200 jobs per month
      default:
        return 10;
    }
  }
}






