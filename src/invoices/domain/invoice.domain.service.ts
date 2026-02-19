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
    status?: 'PAID' | 'UNPAID';
    paymentMethod?: 'BANK_TRANSFER' | 'CARD' | 'CASH';
  }): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Validate payment method if marking as paid
    if (data.status === 'PAID' && !data.paymentMethod) {
      errors.push('Payment method is required when marking invoice as paid');
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
   */
  generateInvoiceNumber(invoiceCount: number): string {
    return `INV-${String(invoiceCount + 1).padStart(6, '0')}`;
  }

  /**
   * Calculate due date (default 30 days from now)
   */
  calculateDueDate(days: number = 30): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
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
