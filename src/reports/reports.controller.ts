import { Controller, Get, Param, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../shared/types/user.types';
import { ReportsService } from './reports.service';
import { ExportService } from './export.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private reportsService: ReportsService,
    private exportService: ExportService,
  ) {}

  @Get('business')
  @Roles('OWNER')
  async getBusinessReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    return this.reportsService.getBusinessReport(user.id, start, end);
  }

  @Get('client/:clientId')
  @Roles('OWNER')
  async getClientReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('clientId') clientId: string,
  ) {
    return this.reportsService.getClientReport(user.id, clientId);
  }

  @Get('export')
  @Roles('OWNER')
  async exportReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type') type: 'jobs' | 'invoices' | 'all' = 'all',
    @Res() res: Response,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const csv = await this.exportService.exportToCSV(user.id, start, end, type);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(csv);
  }
}
