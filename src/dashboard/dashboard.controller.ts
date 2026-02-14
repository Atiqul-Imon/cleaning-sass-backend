import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';

@Controller('dashboard')
@UseGuards(AuthGuard, RolesGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@CurrentUser() user: any, @Req() req: Request) {
    const userRole = (req as any).role || 'OWNER';
    return this.dashboardService.getStats(user.id, userRole);
  }
}

