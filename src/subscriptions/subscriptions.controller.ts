import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../shared/types/user.types';
import { SubscriptionsService } from './subscriptions.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';

@Controller('subscriptions')
@UseGuards(AuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get()
  @Roles('OWNER')
  async getSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getSubscription(user.id);
  }

  @Get('usage')
  @Roles('OWNER')
  async getUsageStats(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getUsageStats(user.id);
  }

  @Put('plan')
  @Roles('OWNER')
  async updatePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body('planType') planType: 'FREE' | 'SOLO' | 'SMALL_TEAM',
    @Body('stripeSubscriptionId') stripeSubscriptionId?: string,
  ) {
    return this.subscriptionsService.updateSubscription(user.id, planType, stripeSubscriptionId);
  }

  @Post('cancel')
  @Roles('OWNER')
  async cancelSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.cancelSubscription(user.id);
  }
}
