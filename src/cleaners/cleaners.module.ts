import { Module } from '@nestjs/common';
import { CleanersController } from './cleaners.controller';
import { CleanersService } from './cleaners.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BusinessModule } from '../business/business.module';

@Module({
  imports: [PrismaModule, AuthModule, BusinessModule],
  controllers: [CleanersController],
  providers: [CleanersService],
  exports: [CleanersService],
})
export class CleanersModule {}
