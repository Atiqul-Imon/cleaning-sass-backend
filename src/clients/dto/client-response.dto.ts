import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientEntity } from '../entities/client.entity';

/**
 * Client Response DTO
 * Response format for client endpoints
 */
export class ClientResponseDto implements ClientEntity {
  @ApiProperty({ description: 'Client ID' })
  id!: string;

  @ApiProperty({ description: 'Business ID' })
  businessId!: string;

  @ApiProperty({ description: 'Client name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Address' })
  address?: string | null;

  @ApiPropertyOptional({ description: 'Client notes' })
  notes?: {
    accessInfo?: string;
    keySafe?: string;
    alarmCode?: string;
    pets?: string;
    preferences?: string;
  } | null;

  @ApiProperty({ description: 'Created at' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt!: Date;
}

/**
 * Client With Relations Response DTO
 * Response format for client with related entities
 */
export class ClientWithRelationsResponseDto extends ClientResponseDto {
  @ApiPropertyOptional({ description: 'Business information' })
  business?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'Recent jobs' })
  jobs?: Array<{
    id: string;
    type: string;
    scheduledDate: Date;
    status: string;
  }>;
}
