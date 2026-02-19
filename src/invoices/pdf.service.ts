import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

interface InvoiceWithRelations {
  id: string;
  invoiceNumber: string;
  amount: any; // Decimal type
  vatAmount: any; // Decimal type
  totalAmount: any; // Decimal type
  status: string;
  paymentMethod?: string;
  paidAt?: Date | string;
  dueDate: Date | string;
  createdAt: Date | string;
  client: {
    name: string;
    phone?: string | null;
    address?: string | null;
  };
  business: {
    name: string;
    phone?: string | null;
    address?: string | null;
    vatEnabled: boolean;
    vatNumber?: string | null;
  };
  job?: {
    type: string;
    scheduledDate: Date | string;
    scheduledTime?: string | null;
  } | null;
}

@Injectable()
export class PdfService {
  generateInvoicePDF(invoice: InvoiceWithRelations): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text(invoice.business.name, 50, 50);
        doc.fontSize(10).font('Helvetica').text('INVOICE', 50, 80);

        // Invoice Number and Date
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text(invoice.invoiceNumber, 400, 50, { align: 'right' });
        doc.fontSize(10).font('Helvetica').text('Invoice Date:', 400, 75, { align: 'right' });
        doc.text(new Date(invoice.createdAt).toLocaleDateString('en-GB'), 400, 90, {
          align: 'right',
        });
        doc.text('Due Date:', 400, 105, { align: 'right' });
        doc.text(new Date(invoice.dueDate).toLocaleDateString('en-GB'), 400, 120, {
          align: 'right',
        });

        // Bill From
        doc.fontSize(12).font('Helvetica-Bold').text('Bill From:', 50, 150);
        doc.fontSize(10).font('Helvetica').text(invoice.business.name, 50, 170);
        if (invoice.business.address) {
          doc.text(invoice.business.address, 50, 185);
        }
        if (invoice.business.phone) {
          doc.text(`Phone: ${invoice.business.phone}`, 50, 200);
        }
        if (invoice.business.vatEnabled && invoice.business.vatNumber) {
          doc.text(`VAT Number: ${invoice.business.vatNumber}`, 50, 215);
        }

        // Bill To
        doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 300, 150);
        doc.fontSize(10).font('Helvetica').text(invoice.client.name, 300, 170);
        if (invoice.client.address) {
          doc.text(invoice.client.address, 300, 185);
        }
        if (invoice.client.phone) {
          doc.text(`Phone: ${invoice.client.phone}`, 300, 200);
        }

        // Line
        doc.moveTo(50, 250).lineTo(550, 250).stroke();

        // Job Information (if available)
        if (invoice.job) {
          doc.fontSize(10).font('Helvetica').text('Job Details:', 50, 270);
          doc.text(
            `${invoice.job.type} - ${new Date(invoice.job.scheduledDate).toLocaleDateString('en-GB')}${
              invoice.job.scheduledTime ? ` at ${invoice.job.scheduledTime}` : ''
            }`,
            50,
            285,
          );
          doc.moveTo(50, 300).lineTo(550, 300).stroke();
        }

        // Invoice Items
        const startY = invoice.job ? 320 : 270;
        doc.fontSize(12).font('Helvetica-Bold').text('Description', 50, startY);
        doc.text('Amount', 450, startY, { align: 'right' });

        doc
          .moveTo(50, startY + 20)
          .lineTo(550, startY + 20)
          .stroke();

        doc
          .fontSize(10)
          .font('Helvetica')
          .text('Cleaning Service', 50, startY + 35);
        doc.text(`£${Number(invoice.amount).toFixed(2)}`, 450, startY + 35, { align: 'right' });

        // VAT
        let currentY = startY + 55;
        if (invoice.business.vatEnabled && Number(invoice.vatAmount) > 0) {
          doc.text('VAT (20%)', 50, currentY);
          doc.text(`£${Number(invoice.vatAmount).toFixed(2)}`, 450, currentY, { align: 'right' });
          currentY += 20;
        }

        // Total
        doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Total', 50, currentY + 15);
        doc.text(`£${Number(invoice.totalAmount).toFixed(2)}`, 450, currentY + 15, {
          align: 'right',
        });

        // Status
        currentY += 50;
        doc.fontSize(10).font('Helvetica').text(`Status: ${invoice.status}`, 50, currentY);
        if (invoice.status === 'PAID' && invoice.paidAt) {
          doc.text(
            `Paid on: ${new Date(invoice.paidAt).toLocaleDateString('en-GB')}`,
            50,
            currentY + 15,
          );
          if (invoice.paymentMethod) {
            doc.text(
              `Payment Method: ${invoice.paymentMethod.replace('_', ' ')}`,
              50,
              currentY + 30,
            );
          }
        }

        // Footer
        const pageHeight = doc.page.height;
        doc
          .fontSize(8)
          .font('Helvetica')
          .text('Thank you for your business!', 50, pageHeight - 50, {
            align: 'center',
          });

        doc.end();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
}
