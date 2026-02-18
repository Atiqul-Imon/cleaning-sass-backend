import { Injectable } from '@nestjs/common';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';

/**
 * Client Domain Service
 * Contains business logic for clients
 * Separated from data access and orchestration
 */
@Injectable()
export class ClientDomainService {
  /**
   * Validate client creation data
   */
  validateCreateClient(data: CreateClientDto): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Client name is required');
    }

    // Validate name length
    if (data.name && data.name.length > 100) {
      errors.push('Client name must be less than 100 characters');
    }

    // Validate phone format (if provided)
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Invalid phone number format');
    }

    // Validate address length (if provided)
    if (data.address && data.address.length > 500) {
      errors.push('Address must be less than 500 characters');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate client update data
   */
  validateUpdateClient(data: UpdateClientDto): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Validate name length (if provided)
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        errors.push('Client name cannot be empty');
      }
      if (data.name.length > 100) {
        errors.push('Client name must be less than 100 characters');
      }
    }

    // Validate phone format (if provided)
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Invalid phone number format');
    }

    // Validate address length (if provided)
    if (data.address && data.address.length > 500) {
      errors.push('Address must be less than 500 characters');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Transform client data for creation
   */
  transformClientData(data: CreateClientDto, businessId: string): any {
    return {
      businessId,
      name: data.name.trim(),
      phone: data.phone?.trim() || undefined,
      address: data.address?.trim() || undefined,
      notes: data.notes || undefined,
    };
  }

  /**
   * Transform client data for update
   */
  transformClientUpdateData(data: UpdateClientDto): any {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone?.trim() || null;
    }
    if (data.address !== undefined) {
      updateData.address = data.address?.trim() || null;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    return updateData;
  }

  /**
   * Validate phone number format
   */
  private isValidPhone(phone: string): boolean {
    // Basic phone validation - allows various formats
    // Remove common separators and check if it's mostly digits
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    return /^\d{7,15}$/.test(cleaned);
  }
}



