import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../shared/types/user.types';
import { ClientsService } from './clients.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';

@Controller('clients')
@UseGuards(AuthGuard, RolesGuard)
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Post()
  @Roles('OWNER') // Only owners can create clients
  async create(@CurrentUser() user: AuthenticatedUser, @Body() data: CreateClientDto) {
    return this.clientsService.create(user.id, data);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Query() pagination: PaginationDto,
  ) {
    const userRole = (req as any).role || 'OWNER';
    return this.clientsService.findAll(user.id, userRole, pagination);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userRole = (req as any).role || 'OWNER';
    return this.clientsService.findOne(user.id, id, userRole);
  }

  @Put(':id')
  @Roles('OWNER') // Only owners can update clients
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() data: UpdateClientDto,
    @Req() req: Request,
  ) {
    const userRole = (req as any).role || 'OWNER';
    return this.clientsService.update(user.id, id, data, userRole);
  }

  @Delete(':id')
  @Roles('OWNER') // Only owners can delete clients
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userRole = (req as any).role || 'OWNER';
    return this.clientsService.remove(user.id, id, userRole);
  }

  @Get(':id/jobs')
  async getJobHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userRole = (req as any).role || 'OWNER';
    return this.clientsService.getJobHistory(user.id, id, userRole);
  }
}
