import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard API Response DTO
 * Wraps all API responses in a consistent format
 */
export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  error?: string;

  constructor(success: boolean, data?: T, message?: string, error?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
  }

  static success<T>(data: T, message?: string): ApiResponseDto<T> {
    return new ApiResponseDto(true, data, message);
  }

  static error(error: string, message?: string): ApiResponseDto<null> {
    return new ApiResponseDto(false, null, message, error);
  }
}

/**
 * Error Response DTO
 * Standard error response format
 */
export class ErrorResponseDto {
  @ApiProperty()
  success: false;

  @ApiProperty()
  error: string;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  details?: any;

  constructor(error: string, message?: string, details?: any) {
    this.success = false;
    this.error = error;
    this.message = message;
    this.details = details;
  }
}



