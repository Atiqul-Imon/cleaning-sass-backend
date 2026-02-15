import { IsString, IsOptional, IsObject, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * Create Client DTO
 * Enhanced with comprehensive validation and Swagger documentation
 */
export class CreateClientDto {
  @ApiProperty({
    description: 'Client name',
    example: 'John Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Client name is required' })
  @MinLength(1, { message: 'Client name cannot be empty' })
  @MaxLength(100, { message: 'Client name must be less than 100 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Phone number (with country code for WhatsApp)',
    example: '+44 7911 123456',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/, {
    message: 'Invalid phone number format',
  })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiPropertyOptional({
    description: 'Client address',
    example: '123 Cleaning St, London',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Address must be less than 500 characters' })
  @Transform(({ value }) => value?.trim())
  address?: string;

  @ApiPropertyOptional({
    description: 'Client notes (access info, key safe, etc.)',
    example: {
      accessInfo: 'Key under mat',
      keySafe: '1234',
      alarmCode: '5678',
      pets: 'Friendly dog named Max',
      preferences: 'Use eco-friendly products',
    },
  })
  @IsObject()
  @IsOptional()
  notes?: {
    accessInfo?: string;
    keySafe?: string;
    alarmCode?: string;
    pets?: string;
    preferences?: string;
  };
}

/**
 * Update Client DTO
 * Enhanced with comprehensive validation and Swagger documentation
 */
export class UpdateClientDto {
  @ApiPropertyOptional({
    description: 'Client name',
    example: 'John Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  @MinLength(1, { message: 'Client name cannot be empty' })
  @MaxLength(100, { message: 'Client name must be less than 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({
    description: 'Phone number (with country code for WhatsApp)',
    example: '+44 7911 123456',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/, {
    message: 'Invalid phone number format',
  })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiPropertyOptional({
    description: 'Client address',
    example: '123 Cleaning St, London',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Address must be less than 500 characters' })
  @Transform(({ value }) => value?.trim())
  address?: string;

  @ApiPropertyOptional({
    description: 'Client notes (access info, key safe, etc.)',
    example: {
      accessInfo: 'Key under mat',
      keySafe: '1234',
      alarmCode: '5678',
      pets: 'Friendly dog named Max',
      preferences: 'Use eco-friendly products',
    },
  })
  @IsObject()
  @IsOptional()
  notes?: {
    accessInfo?: string;
    keySafe?: string;
    alarmCode?: string;
    pets?: string;
    preferences?: string;
  };
}









