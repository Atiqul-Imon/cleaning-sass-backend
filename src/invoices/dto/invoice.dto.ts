import { IsNumber, IsOptional, IsEnum, Min, Max, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Create Invoice DTO
 * Enhanced with comprehensive validation and Swagger documentation
 */
export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Job ID to create invoice from',
    example: 'job_1234567890',
  })
  @IsString()
  @IsNotEmpty({ message: 'Job ID is required' })
  jobId: string;

  @ApiProperty({
    description: 'Invoice amount (before VAT)',
    example: 100.00,
    minimum: 0.01,
    maximum: 100000,
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amount must be a number with max 2 decimal places' })
  @Min(0.01, { message: 'Amount must be greater than 0' })
  @Max(100000, { message: 'Amount seems unusually high. Please verify.' })
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({
    description: 'Invoice template',
    enum: ['classic', 'modern', 'minimal', 'professional', 'elegant', 'bold'],
    example: 'modern',
  })
  @IsEnum(['classic', 'modern', 'minimal', 'professional', 'elegant', 'bold'], {
    message: 'Invoice template must be one of: classic, modern, minimal, professional, elegant, bold',
  })
  @IsOptional()
  invoiceTemplate?: string;
}

/**
 * Update Invoice DTO
 * Enhanced with comprehensive validation and Swagger documentation
 */
export class UpdateInvoiceDto {
  @ApiPropertyOptional({
    enum: ['PAID', 'UNPAID'],
    description: 'Invoice status',
    example: 'PAID',
  })
  @IsEnum(['PAID', 'UNPAID'], { message: 'Status must be PAID or UNPAID' })
  @IsOptional()
  status?: 'PAID' | 'UNPAID';

  @ApiPropertyOptional({
    enum: ['BANK_TRANSFER', 'CARD', 'CASH'],
    description: 'Payment method (required when marking as PAID)',
    example: 'BANK_TRANSFER',
  })
  @IsEnum(['BANK_TRANSFER', 'CARD', 'CASH'], {
    message: 'Payment method must be BANK_TRANSFER, CARD, or CASH',
  })
  @IsOptional()
  paymentMethod?: 'BANK_TRANSFER' | 'CARD' | 'CASH';
}

