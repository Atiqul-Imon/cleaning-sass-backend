import { Controller, Get, Param, Query, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('subscriptions')
  async getSubscriptions(@Query('status') status?: string, @Query('planType') planType?: string) {
    return this.adminService.getSubscriptions({ status, planType });
  }

  @Get('subscriptions/:businessId')
  async getSubscriptionByBusinessId(@Param('businessId') businessId: string) {
    return this.adminService.getSubscriptionByBusinessId(businessId);
  }

  @Patch('subscriptions/:businessId')
  async updateSubscription(
    @Param('businessId') businessId: string,
    @Body()
    body: {
      planType?: 'SOLO' | 'TEAM' | 'BUSINESS';
      status?: 'TRIALING' | 'ACTIVE' | 'CANCELLED' | 'PAST_DUE';
      currentPeriodEnd?: string;
      payoneerEmail?: string;
      adminNotes?: string;
      paymentMethod?: string;
    },
  ) {
    const data: Parameters<AdminService['updateSubscription']>[1] = {};
    if (body.planType !== undefined) {
      data.planType = body.planType;
    }
    if (body.status !== undefined) {
      data.status = body.status;
    }
    if (body.currentPeriodEnd) {
      data.currentPeriodEnd = new Date(body.currentPeriodEnd);
    }
    if (body.payoneerEmail !== undefined) {
      data.payoneerEmail = body.payoneerEmail;
    }
    if (body.adminNotes !== undefined) {
      data.adminNotes = body.adminNotes;
    }
    if (body.paymentMethod !== undefined) {
      data.paymentMethod = body.paymentMethod as Parameters<
        AdminService['updateSubscription']
      >[1]['paymentMethod'];
    }
    return this.adminService.updateSubscription(businessId, data);
  }

  @Post('subscriptions/:businessId/extend')
  async extendSubscription(
    @Param('businessId') businessId: string,
    @Body('months') months?: string,
  ) {
    return this.adminService.extendSubscription(businessId, parseInt(months || '1', 10));
  }

  @Post('subscriptions/:businessId/record-payment')
  async recordPayment(
    @Param('businessId') businessId: string,
    @Body()
    body: {
      planType: 'SOLO' | 'TEAM' | 'BUSINESS';
      months?: number;
      payoneerEmail?: string;
      adminNotes?: string;
    },
  ) {
    return this.adminService.recordPayment(businessId, body);
  }

  @Get('businesses')
  async getAllBusinesses(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminService.getAllBusinesses(pageNum, limitNum);
  }

  @Get('businesses/:id')
  async getBusinessDetails(@Param('id') id: string) {
    return this.adminService.getBusinessDetails(id);
  }

  @Get('users')
  async getAllUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminService.getAllUsers(pageNum, limitNum);
  }
}
