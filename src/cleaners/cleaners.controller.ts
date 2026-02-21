import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../shared/types/user.types';
import { CleanersService } from './cleaners.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { CreateCleanerDto } from './dto/create-cleaner.dto';

@Controller('business/cleaners')
@UseGuards(AuthGuard, RolesGuard)
export class CleanersController {
  constructor(private cleanersService: CleanersService) {}

  @Post()
  @Roles('OWNER')
  async createCleaner(@CurrentUser() user: AuthenticatedUser, @Body() data: CreateCleanerDto) {
    return this.cleanersService.createCleaner(user.id, data.email, data.name);
  }

  @Get()
  @Roles('OWNER')
  async getCleaners(@CurrentUser() user: AuthenticatedUser) {
    return this.cleanersService.getCleaners(user.id);
  }

  @Get('my-business')
  async getMyBusiness(@CurrentUser() user: AuthenticatedUser) {
    return this.cleanersService.getCleanerBusiness(user.id);
  }

  @Get(':cleanerId')
  @Roles('OWNER')
  async getCleaner(@CurrentUser() user: AuthenticatedUser, @Param('cleanerId') cleanerId: string) {
    return this.cleanersService.getCleanerById(user.id, cleanerId);
  }

  @Delete(':cleanerId')
  @Roles('OWNER')
  async removeCleaner(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cleanerId') cleanerId: string,
  ) {
    return this.cleanersService.removeCleaner(user.id, cleanerId);
  }

  @Post(':cleanerId/deactivate')
  @Roles('OWNER')
  async deactivateCleaner(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cleanerId') cleanerId: string,
  ) {
    return this.cleanersService.deactivateCleaner(user.id, cleanerId);
  }
}
