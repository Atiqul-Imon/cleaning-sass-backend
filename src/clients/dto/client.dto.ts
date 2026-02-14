import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsObject()
  @IsOptional()
  notes?: {
    keySafe?: string;
    alarmCode?: string;
    pets?: string;
    preferences?: string;
  };
}

export class UpdateClientDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsObject()
  @IsOptional()
  notes?: {
    keySafe?: string;
    alarmCode?: string;
    pets?: string;
    preferences?: string;
  };
}






