import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';

@Controller('business')
@UseGuards(AuthGuard, RolesGuard)
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Get()
  async getBusiness(@CurrentUser() user: any) {
    return this.businessService.findByUserId(user.id);
  }

  @Post()
  @Roles('OWNER') // Only owners can create business
  async createBusiness(
    @CurrentUser() user: any,
    @Body() data: CreateBusinessDto,
  ) {
    return this.businessService.create(user.id, data);
  }

  @Put()
  @Roles('OWNER') // Only owners can update business
  async updateBusiness(
    @CurrentUser() user: any,
    @Body() data: UpdateBusinessDto,
  ) {
    return this.businessService.update(user.id, data);
  }

  @Put('vat')
  @Roles('OWNER') // Only owners can toggle VAT
  async toggleVat(
    @CurrentUser() user: any,
    @Body('vatEnabled') vatEnabled: boolean,
    @Body('vatNumber') vatNumber?: string,
  ) {
    return this.businessService.toggleVat(user.id, vatEnabled, vatNumber);
  }

  @Get('cleaners')
  @Roles('OWNER') // Only owners can view cleaners
  async getCleaners(@CurrentUser() user: any) {
    return this.businessService.getCleaners(user.id);
  }
}

