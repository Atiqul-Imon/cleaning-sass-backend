import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceEntity, InvoiceWithRelations } from '../entities/invoice.entity';

/**
 * Invoice Response DTO
 * Response format for invoice endpoints
 */
export class InvoiceResponseDto implements InvoiceEntity {
  @ApiProperty({ description: 'Invoice ID' })
  id: string;

  @ApiProperty({ description: 'Business ID' })
  businessId: string;

  @ApiPropertyOptional({ description: 'Job ID' })
  jobId?: string | null;

  @ApiProperty({ description: 'Client ID' })
  clientId: string;

  @ApiProperty({ description: 'Invoice number' })
  invoiceNumber: string;

  @ApiProperty({ description: 'Amount (before VAT)' })
  amount: number;

  @ApiProperty({ description: 'VAT amount' })
  vatAmount: number;

  @ApiProperty({ description: 'Total amount (including VAT)' })
  totalAmount: number;

  @ApiProperty({ enum: ['PAID', 'UNPAID'], description: 'Invoice status' })
  status: 'PAID' | 'UNPAID';

  @ApiProperty({ description: 'Due date' })
  dueDate: Date;

  @ApiPropertyOptional({ enum: ['BANK_TRANSFER', 'CARD', 'CASH'], description: 'Payment method' })
  paymentMethod?: 'BANK_TRANSFER' | 'CARD' | 'CASH' | null;

  @ApiPropertyOptional({ description: 'Paid at date' })
  paidAt?: Date | null;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

/**
 * Invoice With Relations Response DTO
 * Response format for invoice with related entities
 */
export class InvoiceWithRelationsResponseDto extends InvoiceResponseDto {
  @ApiPropertyOptional({ description: 'Client information' })
  client?: {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
  };

  @ApiPropertyOptional({ description: 'Job information' })
  job?: {
    id: string;
    type: string;
    scheduledDate: Date;
    scheduledTime?: string | null;
  } | null;

  @ApiPropertyOptional({ description: 'Business information' })
  business?: {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    vatEnabled: boolean;
    vatNumber?: string | null;
    invoiceTemplate?: string | null;
  };
}



