import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
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
  async createCleaner(
    @CurrentUser() user: any,
    @Body() data: CreateCleanerDto,
  ) {
    return this.cleanersService.createCleaner(user.id, data.email, data.name);
  }

  @Get()
  @Roles('OWNER')
  async getCleaners(@CurrentUser() user: any) {
    return this.cleanersService.getCleaners(user.id);
  }

  @Get('my-business')
  async getMyBusiness(@CurrentUser() user: any) {
    return this.cleanersService.getCleanerBusiness(user.id);
  }

  @Delete(':cleanerId')
  @Roles('OWNER')
  async removeCleaner(
    @CurrentUser() user: any,
    @Param('cleanerId') cleanerId: string,
  ) {
    return this.cleanersService.removeCleaner(user.id, cleanerId);
  }

  @Post(':cleanerId/deactivate')
  @Roles('OWNER')
  async deactivateCleaner(
    @CurrentUser() user: any,
    @Param('cleanerId') cleanerId: string,
  ) {
    return this.cleanersService.deactivateCleaner(user.id, cleanerId);
  }
}





