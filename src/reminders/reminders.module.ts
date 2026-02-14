import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { EmailService } from './email.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RemindersService, EmailService],
  exports: [RemindersService, EmailService],
})
export class RemindersModule {}



