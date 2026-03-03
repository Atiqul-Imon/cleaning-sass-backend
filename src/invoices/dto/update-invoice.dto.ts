import { IsOptional, IsNumber, Min, IsDateString, IsIn } from 'class-validator';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsIn(['PAID', 'UNPAID'])
  status?: 'PAID' | 'UNPAID';

  @IsOptional()
  @IsIn(['BANK_TRANSFER', 'CARD', 'CASH'])
  paymentMethod?: 'BANK_TRANSFER' | 'CARD' | 'CASH';
}
