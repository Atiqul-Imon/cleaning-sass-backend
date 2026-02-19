import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import compression from 'compression';
import * as zlib from 'zlib';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable response compression (gzip/brotli) with optimized settings
  app.use(
    compression({
      filter: (req, res) => {
        // Compress all responses except if explicitly disabled
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Compress JSON, text, and other compressible content types
        const contentType = res.getHeader('content-type') as string;
        if (contentType) {
          // Always compress JSON responses
          if (contentType.includes('application/json')) {
            return true;
          }
          // Compress text-based responses
          if (
            contentType.includes('text/') ||
            contentType.includes('application/javascript') ||
            contentType.includes('application/xml') ||
            contentType.includes('application/xhtml+xml')
          ) {
            return true;
          }
        }
        // Use default compression filter for other content types
        return compression.filter(req, res);
      },
      level: 6, // Compression level (1-9, 6 is a good balance between speed and size)
      threshold: 512, // Compress responses larger than 512 bytes (lowered from 1KB for better optimization)
      // Enable brotli compression if supported by client
      brotli: {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4, // Brotli quality (0-11, 4 is good balance)
        },
      },
      // Chunk size for streaming compression
      chunkSize: 16 * 1024, // 16KB chunks
    }),
  );

  // Enable CORS for frontend
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://clenvora.com',
    'https://clenvora.com',
    'https://www.clenvora.com',
    'https://api.clenvora.com',
    'http://localhost:3000', // Development
    'http://localhost:3001', // Development alternative
  ].filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Clenvora API')
    .setDescription('API documentation for the Clenvora cleaning business management platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('jobs', 'Job management endpoints')
    .addTag('clients', 'Client management endpoints')
    .addTag('invoices', 'Invoice management endpoints')
    .addTag('business', 'Business management endpoints')
    .addTag('admin', 'Admin panel endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`🚀 Backend server running on port ${port}`);
  console.log(`📚 Swagger API documentation available at http://localhost:${port}/api`);
}
void bootstrap();
