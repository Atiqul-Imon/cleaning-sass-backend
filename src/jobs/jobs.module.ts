import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { RecurringJobsService } from './recurring-jobs.service';
import { JobRemindersService } from './job-reminders.service';
import { JobsRepository } from './repositories/jobs.repository';
import { JobDomainService } from './domain/job.domain.service';
import { BusinessModule } from '../business/business.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { RemindersModule } from '../reminders/reminders.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedDomainModule } from '../shared/domain/shared-domain.module';

@Module({
  imports: [
    PrismaModule,
    BusinessModule,
    AuthModule,
    SubscriptionsModule,
    RemindersModule,
    WhatsAppModule,
    SharedDomainModule,
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    RecurringJobsService,
    JobRemindersService,
    JobsRepository,
    JobDomainService,
  ],
  exports: [JobsService, JobsRepository],
})
export class JobsModule {}
