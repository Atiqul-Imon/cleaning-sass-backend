import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, IsIn } from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  vatEnabled?: boolean;

  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @IsOptional()
  invoiceTemplate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  @IsIn([0, 1, 3, 7, 15, 30])
  invoiceDueDateDays?: number;
}

export class UpdateBusinessDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  vatEnabled?: boolean;

  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @IsOptional()
  invoiceTemplate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  @IsIn([0, 1, 3, 7, 15, 30])
  invoiceDueDateDays?: number;
}
