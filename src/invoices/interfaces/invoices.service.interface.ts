import { InvoiceEntity, InvoiceWithRelations } from '../entities/invoice.entity';

/**
 * Invoices Service Interface
 * Defines the contract for InvoicesService
 */
export interface IInvoicesService {
  /**
   * Create an invoice from a job
   */
  createFromJob(userId: string, jobId: string, amount: number): Promise<InvoiceEntity>;

  /**
   * Find all invoices for a user
   * Returns paginated response if pagination is provided, otherwise returns all results
   */
  findAll(
    userId: string,
    pagination?: { page?: number; limit?: number },
  ): Promise<InvoiceWithRelations[] | { data: InvoiceWithRelations[]; pagination: any }>;

  /**
   * Find a single invoice by ID
   */
  findOne(userId: string, invoiceId: string): Promise<InvoiceWithRelations>;

  /**
   * Update an invoice
   */
  update(
    userId: string,
    invoiceId: string,
    data: { status?: 'PAID' | 'UNPAID'; paymentMethod?: 'BANK_TRANSFER' | 'CARD' | 'CASH' },
  ): Promise<InvoiceEntity>;

  /**
   * Mark invoice as paid
   */
  markAsPaid(userId: string, invoiceId: string, paymentMethod: string): Promise<InvoiceEntity>;

  /**
   * Get WhatsApp link for invoice
   */
  getWhatsAppLink(
    userId: string,
    invoiceId: string,
  ): Promise<{ whatsappUrl: string | null; phoneNumber?: string }>;
}
