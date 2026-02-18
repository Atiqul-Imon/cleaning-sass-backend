import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable response compression (gzip)
  app.use(compression({
    filter: (req, res) => {
      // Compress all responses except if explicitly disabled
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression for all text-based responses
      return compression.filter(req, res);
    },
    level: 6, // Compression level (1-9, 6 is a good balance)
    threshold: 1024, // Only compress responses larger than 1KB
  }));
  
  // Enable CORS for frontend
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://fieldneat.pixelforgebd.com',
    'https://fieldneat.pixelforgebd.com',
    'http://localhost:3000', // Development
  ].filter(Boolean);
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
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
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('FieldNeat API')
    .setDescription('API documentation for the FieldNeat cleaning business management platform')
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
bootstrap();
