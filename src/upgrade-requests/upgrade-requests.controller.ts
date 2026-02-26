import { Controller, Post, Get, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../shared/types/user.types';
import { UpgradeRequestsService } from './upgrade-requests.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';

@Controller('upgrade-requests')
@UseGuards(AuthGuard, RolesGuard)
export class UpgradeRequestsController {
  constructor(private upgradeRequestsService: UpgradeRequestsService) {}

  @Post()
  @Roles('OWNER')
  async requestUpgrade(
    @CurrentUser() user: AuthenticatedUser,
    @Body('toPlan') toPlan: 'SOLO' | 'TEAM' | 'BUSINESS',
    @Body('message') message?: string,
  ) {
    return this.upgradeRequestsService.requestUpgrade(user.id, toPlan, message);
  }

  @Get()
  @Roles('ADMIN')
  async getAllRequests(@Query('status') status?: string) {
    return this.upgradeRequestsService.getAllRequests(status);
  }

  @Patch(':id/process')
  @Roles('ADMIN')
  async markAsProcessed(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.upgradeRequestsService.markAsProcessed(id, user.id);
  }
}
