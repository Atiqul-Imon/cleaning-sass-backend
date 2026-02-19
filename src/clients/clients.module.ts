import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ClientsRepository } from './repositories/clients.repository';
import { ClientDomainService } from './domain/client.domain.service';
import { BusinessModule } from '../business/business.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedDomainModule } from '../shared/domain/shared-domain.module';

@Module({
  imports: [PrismaModule, BusinessModule, AuthModule, SharedDomainModule],
  controllers: [ClientsController],
  providers: [ClientsService, ClientsRepository, ClientDomainService],
  exports: [ClientsService, ClientsRepository],
})
export class ClientsModule {}
