import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Initialize email transporter
    // For production, use SMTP credentials from environment variables
    // For development, you can use Ethereal Email or a service like SendGrid, Mailgun, etc.
    const emailApiKey = process.env.EMAIL_API_KEY;
    const emailService = process.env.EMAIL_SERVICE || 'gmail'; // gmail, sendgrid, mailgun, etc.

    if (emailApiKey) {
      if (emailService === 'gmail') {
        // Gmail SMTP
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: emailApiKey, // App password for Gmail
          },
        });
      } else if (emailService === 'sendgrid') {
        // SendGrid
        (this as unknown as { transporter: nodemailer.Transporter }).transporter =
          nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            auth: {
              user: 'apikey',
              pass: emailApiKey,
            },
          });
      } else {
        // Generic SMTP
        (this as unknown as { transporter: nodemailer.Transporter }).transporter =
          nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
              user: process.env.EMAIL_USER,
              pass: emailApiKey,
            },
          });
      }
    } else {
      // Development mode - use Ethereal Email for testing
      this.logger.warn('EMAIL_API_KEY not set, using Ethereal Email for testing');
      // In production, this should throw an error
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (!this.transporter) {
        this.logger.warn('Email transporter not configured, skipping email send');
        this.logger.warn(`Would send email to: ${options.to}, Subject: ${options.subject}`);
        return;
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@clenvora.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      throw error;
    }
  }
}
