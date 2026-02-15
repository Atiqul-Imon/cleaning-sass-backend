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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import type { Request } from 'express';
import { JobsService } from './jobs.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { JobResponseDto, JobWithRelationsResponseDto } from './dto/job-response.dto';

@ApiTags('jobs')
@ApiBearerAuth('JWT-auth')
@Controller('jobs')
@UseGuards(AuthGuard, RolesGuard)
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post()
  @Roles('OWNER')
  @ApiOperation({ summary: 'Create a new job' })
  @ApiResponse({
    status: 201,
    description: 'Job created successfully',
    type: JobResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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

  @Get(':id/whatsapp/photos')
  @Roles('OWNER', 'CLEANER') // Both owners and cleaners can send photos
  async getWhatsAppLinkForPhotos(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userRole = (req as any).role || 'OWNER';
    const photoType = (req.query.photoType as 'BEFORE' | 'AFTER' | 'ALL') || 'ALL';
    return this.jobsService.getWhatsAppLinkForPhotos(user.id, id, photoType, userRole);
  }

  @Get(':id/whatsapp/completion')
  @Roles('OWNER', 'CLEANER') // Both owners and cleaners can send completion message
  async getWhatsAppLinkForCompletion(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userRole = (req as any).role || 'OWNER';
    return this.jobsService.getWhatsAppLinkForCompletion(user.id, id, userRole);
  }
}

