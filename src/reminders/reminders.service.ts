import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // Run daily at 9 AM to check for unpaid invoices due soon
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendPaymentReminders() {
    this.logger.log('Starting payment reminders...');

    try {
      // Find unpaid invoices due in the next 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const unpaidInvoices = await this.prisma.invoice.findMany({
        where: {
          status: 'UNPAID',
          dueDate: {
            lte: threeDaysFromNow,
            gte: new Date(), // Not overdue yet, or just became overdue
          },
        },
        include: {
          client: true,
          business: true,
          job: true,
        },
      });

      this.logger.log(`Found ${unpaidInvoices.length} invoices to send reminders for`);

      for (const invoice of unpaidInvoices) {
        try {
          await this.sendReminderEmail(invoice);
          this.logger.log(`Sent reminder for invoice ${invoice.invoiceNumber}`);
        } catch (error) {
          this.logger.error(`Failed to send reminder for invoice ${invoice.id}:`, error);
        }
      }

      this.logger.log('Payment reminders completed');
    } catch (error) {
      this.logger.error('Error in payment reminders:', error);
    }
  }

  private async sendReminderEmail(invoice: any) {
    const daysUntilDue = Math.ceil(
      (new Date(invoice.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );

    const subject =
      daysUntilDue < 0
        ? `Overdue Invoice: ${invoice.invoiceNumber}`
        : `Payment Reminder: Invoice ${invoice.invoiceNumber} Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 20px; }
            .invoice-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .amount { font-size: 24px; font-weight: bold; color: #4f46e5; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${invoice.business.name}</h1>
            </div>
            <div class="content">
              <h2>${subject}</h2>
              <p>Dear ${invoice.client.name},</p>
              <p>This is a friendly reminder that you have an outstanding invoice:</p>
              <div class="invoice-details">
                <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
                <p><strong>Amount Due:</strong> <span class="amount">£${Number(invoice.totalAmount).toFixed(2)}</span></p>
                <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString(
                  'en-GB',
                  {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  },
                )}</p>
                ${invoice.job ? `<p><strong>Service:</strong> ${invoice.job.type} - ${new Date(invoice.job.scheduledDate).toLocaleDateString('en-GB')}</p>` : ''}
              </div>
              <p>Please arrange payment at your earliest convenience. If you have already made payment, please disregard this reminder.</p>
              <p>Thank you for your business!</p>
              <p>Best regards,<br>${invoice.business.name}</p>
            </div>
            <div class="footer">
              <p>This is an automated reminder. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
${invoice.business.name}

${subject}

Dear ${invoice.client.name},

This is a friendly reminder that you have an outstanding invoice:

Invoice Number: ${invoice.invoiceNumber}
Amount Due: £${Number(invoice.totalAmount).toFixed(2)}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}
${invoice.job ? `Service: ${invoice.job.type} - ${new Date(invoice.job.scheduledDate).toLocaleDateString('en-GB')}` : ''}

Please arrange payment at your earliest convenience. If you have already made payment, please disregard this reminder.

Thank you for your business!

Best regards,
${invoice.business.name}
    `;

    // Try to get email from client notes or use a placeholder
    // Note: In production, add email field to Client model
    const clientEmail =
      invoice.client.email ||
      (invoice.client.notes &&
        typeof invoice.client.notes === 'object' &&
        invoice.client.notes.email) ||
      null;

    if (clientEmail) {
      await this.emailService.sendEmail({
        to: clientEmail,
        subject,
        html,
        text,
      });
    } else {
      this.logger.warn(`No email address for client ${invoice.client.id}, cannot send reminder`);
      // In production, you might want to send SMS or use another communication method
    }
  }

  // Manual trigger for testing
  async sendRemindersNow() {
    await this.sendPaymentReminders();
  }
}
