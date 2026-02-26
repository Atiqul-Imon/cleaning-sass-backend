import { Module } from '@nestjs/common';
import { UpgradeRequestsController } from './upgrade-requests.controller';
import { UpgradeRequestsService } from './upgrade-requests.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessModule } from '../business/business.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, BusinessModule, SubscriptionsModule],
  controllers: [UpgradeRequestsController],
  providers: [UpgradeRequestsService],
  exports: [UpgradeRequestsService],
})
export class UpgradeRequestsModule {}
