import { InvoiceEntity, InvoiceWithRelations } from '../entities/invoice.entity';

/**
 * Invoices Service Interface
 * Defines the contract for InvoicesService
 */
export interface IInvoicesService {
  /**
   * Create an invoice from a job
   */
  createFromJob(userId: string, jobId: string, amount: number): Promise<any>;

  /**
   * Find all invoices for a user
   */
  findAll(userId: string): Promise<any[]>;

  /**
   * Find a single invoice by ID
   */
  findOne(userId: string, invoiceId: string): Promise<any>;

  /**
   * Update an invoice
   */
  update(userId: string, invoiceId: string, data: { status?: 'PAID' | 'UNPAID'; paymentMethod?: 'BANK_TRANSFER' | 'CARD' | 'CASH' }): Promise<any>;

  /**
   * Mark invoice as paid
   */
  markAsPaid(userId: string, invoiceId: string, paymentMethod: string): Promise<any>;

  /**
   * Get WhatsApp link for invoice
   */
  getWhatsAppLink(userId: string, invoiceId: string): Promise<{ whatsappUrl: string | null; phoneNumber?: string }>;
}

