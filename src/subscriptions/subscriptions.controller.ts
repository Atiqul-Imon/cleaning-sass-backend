import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';

@Controller('subscriptions')
@UseGuards(AuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get()
  @Roles('OWNER')
  async getSubscription(@CurrentUser() user: any) {
    return this.subscriptionsService.getSubscription(user.id);
  }

  @Get('usage')
  @Roles('OWNER')
  async getUsageStats(@CurrentUser() user: any) {
    return this.subscriptionsService.getUsageStats(user.id);
  }

  @Put('plan')
  @Roles('OWNER')
  async updatePlan(
    @CurrentUser() user: any,
    @Body('planType') planType: 'FREE' | 'SOLO' | 'SMALL_TEAM',
    @Body('stripeSubscriptionId') stripeSubscriptionId?: string,
  ) {
    return this.subscriptionsService.updateSubscription(
      user.id,
      planType,
      stripeSubscriptionId,
    );
  }

  @Post('cancel')
  @Roles('OWNER')
  async cancelSubscription(@CurrentUser() user: any) {
    return this.subscriptionsService.cancelSubscription(user.id);
  }
}








