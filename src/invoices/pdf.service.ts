import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { formatDate } from '../common/date-format';

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
  invoiceTemplate?: string;
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
    invoiceTemplate?: string;
  };
  job?: {
    type: string;
    scheduledDate: Date | string;
    scheduledTime?: string | null;
  } | null;
}

// Professional color schemes for different templates
const COLOR_SCHEMES = {
  classic: {
    primary: '#1e40af', // Blue
    secondary: '#64748b', // Slate
    accent: '#0ea5e9', // Light blue
    text: '#1e293b',
    lightBg: '#f1f5f9',
  },
  modern: {
    primary: '#059669', // Emerald
    secondary: '#6b7280', // Gray
    accent: '#10b981', // Green
    text: '#111827',
    lightBg: '#f0fdf4',
  },
  minimal: {
    primary: '#18181b', // Zinc
    secondary: '#71717a', // Zinc-500
    accent: '#3f3f46', // Zinc-700
    text: '#09090b',
    lightBg: '#fafafa',
  },
  professional: {
    primary: '#7c3aed', // Violet
    secondary: '#64748b', // Slate
    accent: '#8b5cf6', // Purple
    text: '#1e293b',
    lightBg: '#faf5ff',
  },
  elegant: {
    primary: '#be123c', // Rose
    secondary: '#78716c', // Stone
    accent: '#e11d48', // Rose-600
    text: '#292524',
    lightBg: '#fff1f2',
  },
  bold: {
    primary: '#ea580c', // Orange
    secondary: '#525252', // Neutral
    accent: '#f97316', // Orange-500
    text: '#171717',
    lightBg: '#fff7ed',
  },
};

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

        // Get template and colors
        const template = invoice.invoiceTemplate || invoice.business.invoiceTemplate || 'classic';
        const colors =
          COLOR_SCHEMES[template as keyof typeof COLOR_SCHEMES] || COLOR_SCHEMES.classic;

        // Header with colored background
        doc.rect(0, 0, 595, 120).fill(colors.primary);

        // Business name in header
        doc
          .fontSize(28)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text(invoice.business.name, 50, 40, { width: 300 });

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#ffffff')
          .fillOpacity(0.9)
          .text('INVOICE', 50, 85);

        // Invoice number and dates (white on colored background)
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .fillOpacity(1)
          .text(invoice.invoiceNumber, 400, 40, { align: 'right', width: 145 });

        doc.fontSize(9).font('Helvetica').fillColor('#ffffff').fillOpacity(0.85);

        doc.text('Invoice Date', 400, 75, { align: 'right', width: 145 });
        doc.font('Helvetica-Bold').fillOpacity(1).text(formatDate(invoice.createdAt), 400, 88, {
          align: 'right',
          width: 145,
        });

        // Reset fill color and opacity for rest of document
        doc.fillColor(colors.text).fillOpacity(1);

        // Bill From and Bill To section with subtle background
        doc.rect(50, 150, 495, 120).fill(colors.lightBg);

        // Bill From
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('BILL FROM', 65, 165);

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(colors.text)
          .text(invoice.business.name, 65, 185);

        doc.fontSize(9).font('Helvetica').fillColor(colors.secondary);

        let fromY = 200;
        if (invoice.business.address) {
          doc.text(invoice.business.address, 65, fromY, { width: 200 });
          fromY += 25;
        }
        if (invoice.business.phone) {
          doc.text(`📞 ${invoice.business.phone}`, 65, fromY);
          fromY += 15;
        }
        if (invoice.business.vatEnabled && invoice.business.vatNumber) {
          doc.text(`VAT: ${invoice.business.vatNumber}`, 65, fromY);
        }

        // Bill To
        doc.fontSize(11).font('Helvetica-Bold').fillColor(colors.primary).text('BILL TO', 325, 165);

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(colors.text)
          .text(invoice.client.name, 325, 185);

        doc.fontSize(9).font('Helvetica').fillColor(colors.secondary);

        let toY = 200;
        if (invoice.client.address) {
          doc.text(invoice.client.address, 325, toY, { width: 200 });
          toY += 25;
        }
        if (invoice.client.phone) {
          doc.text(`📞 ${invoice.client.phone}`, 325, toY);
        }

        // Due date box
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(colors.accent)
          .text('DUE DATE', 400, 235, { align: 'right', width: 145 });

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text(formatDate(invoice.dueDate), 400, 250, {
            align: 'right',
            width: 145,
          });

        // Job Information (if available) with colored label
        let tableStartY = 300;
        if (invoice.job) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor(colors.primary)
            .text('JOB DETAILS', 50, tableStartY);

          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(colors.text)
            .text(
              `${invoice.job.type.replace('_', ' ')} • ${formatDate(invoice.job.scheduledDate)}${
                invoice.job.scheduledTime ? ` at ${invoice.job.scheduledTime}` : ''
              }`,
              50,
              tableStartY + 18,
            );

          tableStartY += 50;
        }

        // Table header with colored background
        doc.rect(50, tableStartY, 495, 25).fill(colors.primary);

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text('DESCRIPTION', 60, tableStartY + 8);

        doc.text('AMOUNT', 450, tableStartY + 8, { align: 'right', width: 85 });

        // Reset to normal text color
        doc.fillColor(colors.text);

        // Table row
        const rowY = tableStartY + 35;
        doc.fontSize(10).font('Helvetica').text('Cleaning Service', 60, rowY);

        doc
          .font('Helvetica-Bold')
          .text(`£${Number(invoice.amount).toFixed(2)}`, 450, rowY, { align: 'right', width: 85 });

        // Separator line
        doc
          .moveTo(50, rowY + 25)
          .lineTo(545, rowY + 25)
          .strokeColor(colors.lightBg)
          .lineWidth(1)
          .stroke();

        // Subtotal, VAT, and Total section
        let summaryY = rowY + 40;

        doc.fillColor(colors.text);

        // Subtotal
        doc.fontSize(9).font('Helvetica').text('Subtotal', 380, summaryY);

        doc.text(`£${Number(invoice.amount).toFixed(2)}`, 450, summaryY, {
          align: 'right',
          width: 85,
        });

        // VAT (if applicable)
        if (invoice.business.vatEnabled && Number(invoice.vatAmount) > 0) {
          summaryY += 18;
          doc.text('VAT (20%)', 380, summaryY);
          doc.text(`£${Number(invoice.vatAmount).toFixed(2)}`, 450, summaryY, {
            align: 'right',
            width: 85,
          });
        }

        // Total box with accent color
        summaryY += 25;
        doc.rect(370, summaryY - 5, 175, 35).fill(colors.lightBg);

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('TOTAL', 380, summaryY + 5);

        doc.fontSize(16).text(`£${Number(invoice.totalAmount).toFixed(2)}`, 450, summaryY + 3, {
          align: 'right',
          width: 85,
        });

        // Status badge
        summaryY += 60;
        const statusX = 50;
        const statusText = invoice.status === 'PAID' ? '✓ PAID' : 'UNPAID';
        const statusColor = invoice.status === 'PAID' ? '#059669' : '#dc2626';

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(statusColor)
          .text(statusText, statusX, summaryY);

        if (invoice.status === 'PAID' && invoice.paidAt) {
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(colors.secondary)
            .text(`Paid on ${formatDate(invoice.paidAt)}`, statusX, summaryY + 18);

          if (invoice.paymentMethod) {
            doc.text(`via ${invoice.paymentMethod.replace('_', ' ')}`, statusX, summaryY + 33);
          }
        }

        // Footer with separator
        const pageHeight = doc.page.height;
        doc
          .moveTo(50, pageHeight - 80)
          .lineTo(545, pageHeight - 80)
          .strokeColor(colors.lightBg)
          .lineWidth(2)
          .stroke();

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(colors.secondary)
          .text('Thank you for your business!', 50, pageHeight - 60, {
            align: 'center',
            width: 495,
          });

        doc.end();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
}
