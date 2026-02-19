/**
 * Invoice Entity
 * Domain model representing an invoice
 */
export interface InvoiceEntity {
  id: string;
  businessId: string;
  jobId?: string | null;
  clientId: string;
  invoiceNumber: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  status: 'PAID' | 'UNPAID';
  dueDate: Date;
  paymentMethod?: 'BANK_TRANSFER' | 'CARD' | 'CASH' | null;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invoice with relations
 */
export interface InvoiceWithRelations extends InvoiceEntity {
  client?: {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
  };
  job?: {
    id: string;
    type: string;
    scheduledDate: Date;
    scheduledTime?: string | null;
  } | null;
  business?: {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    vatEnabled: boolean;
    vatNumber?: string | null;
    invoiceTemplate?: string | null;
  };
}
