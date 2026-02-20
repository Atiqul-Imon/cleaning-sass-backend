import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { JobsModule } from '../jobs/jobs.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { BusinessModule } from '../business/business.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [JobsModule, InvoicesModule, BusinessModule, AuthModule, PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
