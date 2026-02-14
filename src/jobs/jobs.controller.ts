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
} from '@nestjs/common';
import type { Request } from 'express';
import { JobsService } from './jobs.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';

@Controller('jobs')
@UseGuards(AuthGuard, RolesGuard)
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post()
  @Roles('OWNER') // Only owners can create jobs
  async create(@CurrentUser() user: any, @Body() data: CreateJobDto) {
    return this.jobsService.create(user.id, data);
  }

  @Get()
  async findAll(@CurrentUser() user: any, @Req() req: Request) {
    // Role is set by AuthGuard on request.role
    const userRole = (req as any).role || 'OWNER';
    return this.jobsService.findAll(user.id, userRole);
  }

  @Get('today')
  async findToday(@CurrentUser() user: any, @Req() req: Request) {
    // Role is set by AuthGuard on request.role
    const userRole = (req as any).role || 'OWNER';
    return this.jobsService.findToday(user.id, userRole);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userRole = (req as any).role || 'OWNER';
    return this.jobsService.findOne(user.id, id, userRole);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: UpdateJobDto,
    @Req() req: Request,
  ) {
    const userRole = (req as any).role || 'OWNER';
    return this.jobsService.update(user.id, id, data, userRole);
  }

  @Delete(':id')
  @Roles('OWNER') // Only owners can delete jobs
  async remove(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userRole = (req as any).role || 'OWNER';
    return this.jobsService.remove(user.id, id, userRole);
  }

  @Post(':id/photos')
  async addPhoto(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: { imageUrl: string; photoType: 'BEFORE' | 'AFTER' },
    @Req() req: Request,
  ) {
    const userRole = (req as any).role || 'OWNER';
    return this.jobsService.addPhoto(user.id, id, data.imageUrl, data.photoType, userRole);
  }

  @Put(':id/checklist/:itemId')
  async updateChecklistItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() data: { completed: boolean },
    @Req() req: Request,
  ) {
    const userRole = (req as any).role || 'OWNER';
    return this.jobsService.updateChecklistItem(user.id, id, itemId, data.completed, userRole);
  }
}

