import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { CleanersModule } from '../cleaners/cleaners.module';

@Module({
  imports: [CleanersModule],
  controllers: [InvitesController],
})
export class InvitesModule {}
