import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ImageKit, { toFile } from '@imagekit/nodejs';

@Injectable()
export class UploadService {
  private imagekit: ImageKit | null = null;

  constructor(private config: ConfigService) {
    const privateKey = this.config.get('IMAGEKIT_PRIVATE_KEY');
    if (privateKey) {
      this.imagekit = new ImageKit({ privateKey });
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'job-photos',
  ): Promise<{ url: string; fileId: string; name: string }> {
    if (!this.imagekit) {
      throw new BadRequestException(
        'ImageKit credentials not configured. Set IMAGEKIT_PRIVATE_KEY in the backend environment.',
      );
    }

    const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const fileForUpload = await toFile(file.buffer, fileName, { type: file.mimetype });

    const result = await this.imagekit.files.upload({
      file: fileForUpload,
      fileName,
      folder,
    });

    if (!result.url) {
      throw new BadRequestException('ImageKit did not return a URL');
    }

    return {
      url: result.url,
      fileId: result.fileId ?? '',
      name: result.name ?? fileName,
    };
  }
}
