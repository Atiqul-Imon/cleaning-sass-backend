import { Controller, Get, Param } from '@nestjs/common';
import { CleanersService } from '../cleaners/cleaners.service';

@Controller('invites')
export class InvitesController {
  constructor(private cleanersService: CleanersService) {}

  @Get(':token')
  async getInvite(@Param('token') token: string) {
    return this.cleanersService.getInviteByToken(token);
  }
}
