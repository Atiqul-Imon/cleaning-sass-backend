import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessService } from '../business/business.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class UpgradeRequestsService {
  constructor(
    private prisma: PrismaService,
    private businessService: BusinessService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async requestUpgrade(userId: string, toPlan: 'SOLO' | 'TEAM' | 'BUSINESS', message?: string) {
    const business = await this.businessService.findByUserId(userId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId: business.id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const fromPlan = subscription.planType;

    // Check if it's an upgrade (not downgrade)
    const planOrder = { SOLO: 0, TEAM: 1, BUSINESS: 2 };
    if (planOrder[toPlan] <= planOrder[fromPlan]) {
      throw new BadRequestException('You can only upgrade to a higher plan');
    }

    // Check if there's already a pending request
    const existingRequest = await this.prisma.upgradeRequest.findFirst({
      where: {
        businessId: business.id,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new BadRequestException('You already have a pending upgrade request');
    }

    // Auto-upgrade the plan immediately (they pay next cycle)
    await this.subscriptionsService.updateSubscription(userId, toPlan);

    // Create notification for admin
    const upgradeRequest = await this.prisma.upgradeRequest.create({
      data: {
        businessId: business.id,
        fromPlan,
        toPlan,
        status: 'COMPLETED',
        autoUpgraded: true,
        message: message || `Auto-upgraded from ${fromPlan} to ${toPlan}`,
      },
    });

    return upgradeRequest;
  }

  async getAllRequests(status?: string) {
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.upgradeRequest.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
            subscription: {
              select: {
                planType: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsProcessed(requestId: string, processedBy: string) {
    const request = await this.prisma.upgradeRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Upgrade request not found');
    }

    return this.prisma.upgradeRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        processedAt: new Date(),
        processedBy,
      },
    });
  }
}
