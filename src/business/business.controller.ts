import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../shared/types/user.types';
import { BusinessService } from './business.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';

@Controller('business')
@UseGuards(AuthGuard, RolesGuard)
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Get()
  async getBusiness(@CurrentUser() user: AuthenticatedUser) {
    return await this.businessService.findByUserId(user.id);
  }

  @Post()
  @Roles('OWNER') // Only owners can create business
  async createBusiness(@CurrentUser() user: AuthenticatedUser, @Body() data: CreateBusinessDto) {
    try {
      return await this.businessService.create(user.id, data);
    } catch (error: any) {
      // Re-throw HttpExceptions as-is
      if (error instanceof HttpException) {
        throw error;
      }
      // Wrap other errors
      throw new HttpException(
        error.message || 'Failed to create business',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put()
  @Roles('OWNER') // Only owners can update business
  async updateBusiness(@CurrentUser() user: AuthenticatedUser, @Body() data: UpdateBusinessDto) {
    return this.businessService.update(user.id, data);
  }

  @Put('vat')
  @Roles('OWNER') // Only owners can toggle VAT
  async toggleVat(
    @CurrentUser() user: AuthenticatedUser,
    @Body('vatEnabled') vatEnabled: boolean,
    @Body('vatNumber') vatNumber?: string,
  ) {
    return this.businessService.toggleVat(user.id, vatEnabled, vatNumber);
  }

  @Get('cleaners')
  @Roles('OWNER') // Only owners can view cleaners
  async getCleaners(@CurrentUser() user: AuthenticatedUser) {
    return this.businessService.getCleaners(user.id);
  }
}
