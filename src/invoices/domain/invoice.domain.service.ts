import { Injectable } from '@nestjs/common';

/**
 * Invoice Domain Service
 * Contains business logic for invoices
 * Separated from data access and orchestration
 */
@Injectable()
export class InvoiceDomainService {
  /**
   * Validate invoice creation data
   */
  validateCreateInvoice(amount: number): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!amount || amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    // Validate amount is reasonable
    if (amount > 100000) {
      errors.push('Amount seems unusually high. Please verify.');
    }

    // Validate amount has max 2 decimal places
    if (amount && !Number.isInteger(amount * 100)) {
      errors.push('Amount can have maximum 2 decimal places');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate invoice update data
   */
  validateUpdateInvoice(data: {
    amount?: number;
    dueDate?: string;
    status?: 'PAID' | 'UNPAID';
    paymentMethod?: 'BANK_TRANSFER' | 'CARD' | 'CASH';
  }): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Validate payment method if marking as paid
    if (data.status === 'PAID' && !data.paymentMethod) {
      errors.push('Payment method is required when marking invoice as paid');
    }

    if (data.amount !== undefined) {
      const amountValidation = this.validateCreateInvoice(data.amount);
      if (!amountValidation.valid && amountValidation.errors) {
        errors.push(...amountValidation.errors);
      }
    }

    if (data.dueDate) {
      const parsed = new Date(data.dueDate);
      if (Number.isNaN(parsed.getTime())) {
        errors.push('Invalid due date format');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Calculate VAT amount
   */
  calculateVAT(amount: number, vatEnabled: boolean): number {
    if (!vatEnabled) {
      return 0;
    }
    // UK VAT rate is 20%
    return Math.round(amount * 0.2 * 100) / 100;
  }

  /**
   * Calculate total amount including VAT
   */
  calculateTotal(amount: number, vatEnabled: boolean): number {
    const vat = this.calculateVAT(amount, vatEnabled);
    return Math.round((amount + vat) * 100) / 100;
  }

  /**
   * Generate invoice number
   * Format: INV-{businessPrefix}-{seq}
   * - businessPrefix: first 8 chars of business ID (ensures global uniqueness)
   * - seq: per-business sequence (000001, 000002, ...) for ordering within business
   */
  generateInvoiceNumber(businessId: string, perBusinessCount: number): string {
    const prefix = businessId.replace(/-/g, '').slice(0, 8);
    const seq = String(perBusinessCount + 1).padStart(6, '0');
    return `INV-${prefix}-${seq}`;
  }

  /**
   * Calculate due date from base date
   * @param days 0 = same day, 1, 3, 7, 15, 30 etc.
   * @param baseDate defaults to now
   */
  calculateDueDate(days: number = 30, baseDate?: Date): Date {
    const base = baseDate ? new Date(baseDate) : new Date();
    base.setHours(0, 0, 0, 0);
    const due = new Date(base);
    due.setDate(due.getDate() + days);
    return due;
  }

  /**
   * Check if invoice is overdue
   */
  isOverdue(dueDate: Date, status: 'PAID' | 'UNPAID'): boolean {
    if (status === 'PAID') {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }

  /**
   * Get days until due date
   */
  getDaysUntilDue(dueDate: Date): number {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}
