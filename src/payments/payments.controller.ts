import { Controller, Post, Body, Headers, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../shared/types/user.types';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';

@Controller('payments')
@UseGuards(AuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-checkout-session')
  @Roles('OWNER')
  async createCheckoutSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body('planType') planType: 'SOLO' | 'SMALL_TEAM',
  ) {
    return this.paymentsService.createCheckoutSession(user.id, planType);
  }

  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Headers('stripe-signature') signature: string) {
    // Note: In production, you should use raw body for webhook verification
    // This is a simplified version - you may need to configure NestJS to accept raw body for this route
    const payload = JSON.stringify(req.body);
    return this.paymentsService.handleWebhook(payload, signature);
  }
}
