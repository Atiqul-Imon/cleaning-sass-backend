import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { RecurringJobsService } from './recurring-jobs.service';
import { BusinessModule } from '../business/business.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [BusinessModule, AuthModule, SubscriptionsModule],
  controllers: [JobsController],
  providers: [JobsService, RecurringJobsService],
  exports: [JobsService],
})
export class JobsModule {}

