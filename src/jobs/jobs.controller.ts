import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../shared/types/user.types';
import { JobsService } from './jobs.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { JobResponseDto } from './dto/job-response.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';
import archiver from 'archiver';
import * as https from 'https';
import * as http from 'http';

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
  @ApiResponse({ status: 404, description: 'Business or client not found' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() data: CreateJobDto) {
    try {
      console.log('[JOBS CONTROLLER] POST /jobs - Request received');
      console.log('[JOBS CONTROLLER] User:', { id: user.id, email: user.email });
      console.log('[JOBS CONTROLLER] Request body:', JSON.stringify(data, null, 2));

      const job = await this.jobsService.create(user.id, data);

      console.log('[JOBS CONTROLLER] ✅ Job created successfully:', job.id);
      return job;
    } catch (error) {
      console.error('[JOBS CONTROLLER] ❌ Error in create endpoint:', error);
      console.error('[JOBS CONTROLLER] Error details:', {
        userId: user.id,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      // Re-throw to let NestJS handle the HTTP response
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all jobs with pagination' })
  @ApiResponse({ status: 200, description: 'List of jobs' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Query() pagination: PaginationDto,
  ) {
    try {
      console.log('[JOBS CONTROLLER] GET /jobs - Request received');
      console.log('[JOBS CONTROLLER] User:', { id: user.id, email: user.email });
      console.log('[JOBS CONTROLLER] Pagination:', pagination);

      // Role is set by AuthGuard on request.role
      const userRole = (req as Request & { role?: 'OWNER' | 'CLEANER' | 'ADMIN' }).role || 'OWNER';
      const result = await this.jobsService.findAll(user.id, userRole, pagination);

      console.log('[JOBS CONTROLLER] ✅ Jobs fetched successfully');
      if (Array.isArray(result)) {
        console.log('[JOBS CONTROLLER] Result: Array with', result.length, 'jobs');
      } else {
        console.log('[JOBS CONTROLLER] Result: Paginated with', result.data?.length || 0, 'jobs');
      }

      return result;
    } catch (error) {
      console.error('[JOBS CONTROLLER] ❌ Error in findAll endpoint:', error);
      console.error('[JOBS CONTROLLER] Error details:', {
        userId: user.id,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack',
      });
      throw error;
    }
  }

  @Get('today')
  async findToday(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    // Role is set by AuthGuard on request.role
    const userRole = (req as Request & { role?: 'OWNER' | 'CLEANER' | 'ADMIN' }).role || 'OWNER';
    return this.jobsService.findToday(user.id, userRole);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userRole = (req as Request & { role?: 'OWNER' | 'CLEANER' | 'ADMIN' }).role || 'OWNER';
    return this.jobsService.findOne(user.id, id, userRole);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() data: UpdateJobDto,
    @Req() req: Request,
  ) {
    const userRole = (req as Request & { role?: 'OWNER' | 'CLEANER' | 'ADMIN' }).role || 'OWNER';
    return this.jobsService.update(user.id, id, data, userRole);
  }

  @Patch(':id')
  async patch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() data: UpdateJobDto,
    @Req() req: Request,
  ) {
    const userRole = (req as Request & { role?: 'OWNER' | 'CLEANER' | 'ADMIN' }).role || 'OWNER';
    return this.jobsService.update(user.id, id, data, userRole);
  }

  @Delete(':id')
  @Roles('OWNER') // Only owners can delete jobs
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userRole = (req as Request & { role?: 'OWNER' | 'CLEANER' | 'ADMIN' }).role || 'OWNER';
    return this.jobsService.remove(user.id, id, userRole);
  }

  @Post(':id/photos')
  async addPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() data: { imageUrl: string; photoType: 'BEFORE' | 'AFTER' },
    @Req() req: Request,
  ) {
    const userRole = (req as Request & { role?: 'OWNER' | 'CLEANER' | 'ADMIN' }).role || 'OWNER';
    return this.jobsService.addPhoto(user.id, id, data.imageUrl, data.photoType, userRole);
  }

  @Put(':id/checklist/:itemId')
  async updateChecklistItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() data: { completed: boolean },
    @Req() req: Request,
  ) {
    const userRole = (req as Request & { role?: 'OWNER' | 'CLEANER' | 'ADMIN' }).role || 'OWNER';
    return this.jobsService.updateChecklistItem(user.id, id, itemId, data.completed, userRole);
  }

  @Get(':id/whatsapp/photos')
  @Roles('OWNER', 'CLEANER') // Both owners and cleaners can send photos
  async getWhatsAppLinkForPhotos(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userRole = (req as Request & { role?: 'OWNER' | 'CLEANER' | 'ADMIN' }).role || 'OWNER';
    const photoType = (req.query.photoType as 'BEFORE' | 'AFTER' | 'ALL') || 'ALL';
    return this.jobsService.getWhatsAppLinkForPhotos(user.id, id, photoType, userRole);
  }

  @Get(':id/whatsapp/completion')
  @Roles('OWNER', 'CLEANER') // Both owners and cleaners can send completion message
  async getWhatsAppLinkForCompletion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userRole = (req as Request & { role?: 'OWNER' | 'CLEANER' | 'ADMIN' }).role || 'OWNER';
    return this.jobsService.getWhatsAppLinkForCompletion(user.id, id, userRole);
  }

  @Get(':id/photos/download')
  @Roles('OWNER', 'CLEANER')
  async downloadPhotos(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const userRole = (req as Request & { role?: 'OWNER' | 'CLEANER' | 'ADMIN' }).role || 'OWNER';
    const photos = await this.jobsService.getPhotosForDownload(user.id, id, userRole);

    if (!photos || photos.length === 0) {
      res.status(404).json({ message: 'No photos found for this job' });
      return;
    }

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="job-${id}-photos.zip"`);

    // Pipe archive to response
    archive.pipe(res);

    // Download and add each photo to the archive
    const downloadPromises = photos.map(async (photo, index) => {
      return new Promise<void>((resolve, reject) => {
        const url = new URL(photo.imageUrl);
        const protocol = url.protocol === 'https:' ? https : http;

        protocol
          .get(photo.imageUrl, (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download image: ${response.statusCode}`));
              return;
            }

            const fileName = `${photo.photoType.toLowerCase()}-${index + 1}.jpg`;
            archive.append(response, { name: fileName });
            resolve();
          })
          .on('error', (error) => {
            console.error(`Error downloading photo ${photo.id}:`, error);
            // Continue even if one photo fails
            resolve();
          });
      });
    });

    // Wait for all downloads to start, then finalize archive
    await Promise.all(downloadPromises);
    await archive.finalize();
  }
}
