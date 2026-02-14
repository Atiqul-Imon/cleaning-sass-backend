import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { BusinessModule } from '../business/business.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [BusinessModule, AuthModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}

