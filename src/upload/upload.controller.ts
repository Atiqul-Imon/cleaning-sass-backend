import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { UploadService } from './upload.service';
import type { AuthenticatedUser } from '../shared/types/user.types';
import { CurrentUser } from '../auth/auth.decorator';
import * as multer from 'multer';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Controller('upload')
@UseGuards(AuthGuard)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Use JPEG, PNG, WebP, or GIF.'), false);
        }
      },
    }),
  )
  async uploadImage(
    @CurrentUser() _user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file received');
    }

    return this.uploadService.uploadImage(file);
  }
}
