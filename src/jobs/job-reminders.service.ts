import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../reminders/email.service';

@Injectable()
export class JobRemindersService {
  private readonly logger = new Logger(JobRemindersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // Run every hour to check for jobs that need reminders
  @Cron(CronExpression.EVERY_HOUR)
  async sendJobReminders() {
    this.logger.log('Starting job reminders check...');

    try {
      const now = new Date();
      const jobs = await this.prisma.job.findMany({
        where: {
          status: 'SCHEDULED',
          reminderEnabled: true,
          reminderSent: false,
          scheduledDate: {
            gte: now, // Only future jobs
          },
        },
        include: {
          client: true,
          business: {
            include: {
              user: true,
            },
          },
          cleaner: true,
        },
      });

      this.logger.log(`Found ${jobs.length} jobs to check for reminders`);

      for (const job of jobs) {
        try {
          const shouldSend = this.shouldSendReminder(job, now);
          if (shouldSend) {
            await this.sendReminder(job);
            // Mark reminder as sent
            await this.prisma.job.update({
              where: { id: job.id },
              data: { reminderSent: true },
            });
            this.logger.log(`Sent reminder for job ${job.id}`);
          }
        } catch (error) {
          this.logger.error(`Failed to process reminder for job ${job.id}:`, error);
        }
      }

      this.logger.log('Job reminders check completed');
    } catch (error) {
      this.logger.error('Error in job reminders check:', error);
    }
  }

  private shouldSendReminder(job: any, now: Date): boolean {
    if (!job.reminderTime) {
      // Default: 1 day before
      return this.isWithinReminderWindow(job.scheduledDate, now, '1 day');
    }

    return this.isWithinReminderWindow(job.scheduledDate, now, job.reminderTime);
  }

  private isWithinReminderWindow(scheduledDate: Date, now: Date, reminderTime: string): boolean {
    const scheduled = new Date(scheduledDate);
    const timeUntilJob = scheduled.getTime() - now.getTime();

    // Parse reminder time (e.g., "1 day", "2 hours", "30 minutes")
    const reminderMs = this.parseReminderTime(reminderTime);

    // Check if we're within the reminder window (within 1 hour of the reminder time)
    const oneHour = 60 * 60 * 1000;
    const timeUntilReminder = timeUntilJob - reminderMs;

    return timeUntilReminder >= 0 && timeUntilReminder <= oneHour;
  }

  private parseReminderTime(reminderTime: string): number {
    const parts = reminderTime.trim().toLowerCase().split(' ');
    if (parts.length !== 2) {
      // Default to 1 day
      return 24 * 60 * 60 * 1000;
    }

    const value = parseInt(parts[0], 10);
    const unit = parts[1];

    if (isNaN(value)) {
      return 24 * 60 * 60 * 1000; // Default to 1 day
    }

    switch (unit) {
      case 'day':
      case 'days':
        return value * 24 * 60 * 60 * 1000;
      case 'hour':
      case 'hours':
        return value * 60 * 60 * 1000;
      case 'minute':
      case 'minutes':
        return value * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000; // Default to 1 day
    }
  }

  private async sendReminder(job: any) {
    const scheduledDate = new Date(job.scheduledDate);
    const formattedDate = scheduledDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = job.scheduledTime || 'Time TBD';

    // Send to business owner
    if (job.business?.user?.email) {
      const ownerSubject = `Reminder: Job scheduled for ${job.client.name} on ${formattedDate}`;
      const ownerHtml = this.getOwnerReminderEmail(job, formattedDate, formattedTime);
      const ownerText = this.getOwnerReminderText(job, formattedDate, formattedTime);

      try {
        await this.emailService.sendEmail({
          to: job.business.user.email,
          subject: ownerSubject,
          html: ownerHtml,
          text: ownerText,
        });
      } catch (error) {
        this.logger.error(`Failed to send reminder to owner for job ${job.id}:`, error);
      }
    }

    // Send to cleaner if assigned
    if (job.cleaner?.email) {
      const cleanerSubject = `Reminder: Job scheduled for ${job.client.name} on ${formattedDate}`;
      const cleanerHtml = this.getCleanerReminderEmail(job, formattedDate, formattedTime);
      const cleanerText = this.getCleanerReminderText(job, formattedDate, formattedTime);

      try {
        await this.emailService.sendEmail({
          to: job.cleaner.email,
          subject: cleanerSubject,
          html: cleanerHtml,
          text: cleanerText,
        });
      } catch (error) {
        this.logger.error(`Failed to send reminder to cleaner for job ${job.id}:`, error);
      }
    }

    // Send to client if email available (in notes or future email field)
    const clientEmail =
      job.client.email ||
      (job.client.notes && typeof job.client.notes === 'object' && job.client.notes.email);

    if (clientEmail) {
      const clientSubject = `Reminder: Cleaning appointment on ${formattedDate}`;
      const clientHtml = this.getClientReminderEmail(job, formattedDate, formattedTime);
      const clientText = this.getClientReminderText(job, formattedDate, formattedTime);

      try {
        await this.emailService.sendEmail({
          to: clientEmail,
          subject: clientSubject,
          html: clientHtml,
          text: clientText,
        });
      } catch (error) {
        this.logger.error(`Failed to send reminder to client for job ${job.id}:`, error);
      }
    }
  }

  private getOwnerReminderEmail(job: any, formattedDate: string, formattedTime: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .job-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #4f46e5; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Job Reminder</h1>
            </div>
            <div class="content">
              <h2>Upcoming Job Scheduled</h2>
              <div class="job-details">
                <p><strong>Client:</strong> ${job.client.name}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                ${job.client.address ? `<p><strong>Address:</strong> ${job.client.address}</p>` : ''}
                ${job.client.phone ? `<p><strong>Phone:</strong> ${job.client.phone}</p>` : ''}
                ${job.cleaner ? `<p><strong>Assigned to:</strong> ${job.cleaner.email}</p>` : '<p><strong>Status:</strong> Unassigned</p>'}
              </div>
              <p>This is an automated reminder for your scheduled cleaning job.</p>
            </div>
            <div class="footer">
              <p>${job.business.name}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getOwnerReminderText(job: any, formattedDate: string, formattedTime: string): string {
    return `
Job Reminder

Upcoming Job Scheduled

Client: ${job.client.name}
Date: ${formattedDate}
Time: ${formattedTime}
${job.client.address ? `Address: ${job.client.address}` : ''}
${job.client.phone ? `Phone: ${job.client.phone}` : ''}
${job.cleaner ? `Assigned to: ${job.cleaner.email}` : 'Status: Unassigned'}

This is an automated reminder for your scheduled cleaning job.

${job.business.name}
    `;
  }

  private getCleanerReminderEmail(job: any, formattedDate: string, formattedTime: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .job-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #10b981; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Job Reminder</h1>
            </div>
            <div class="content">
              <h2>You have a job scheduled</h2>
              <div class="job-details">
                <p><strong>Client:</strong> ${job.client.name}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                ${job.client.address ? `<p><strong>Address:</strong> ${job.client.address}</p>` : ''}
                ${job.client.phone ? `<p><strong>Phone:</strong> ${job.client.phone}</p>` : ''}
              </div>
              <p>Please make sure you're prepared for this appointment.</p>
            </div>
            <div class="footer">
              <p>${job.business.name}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getCleanerReminderText(job: any, formattedDate: string, formattedTime: string): string {
    return `
Job Reminder

You have a job scheduled

Client: ${job.client.name}
Date: ${formattedDate}
Time: ${formattedTime}
${job.client.address ? `Address: ${job.client.address}` : ''}
${job.client.phone ? `Phone: ${job.client.phone}` : ''}

Please make sure you're prepared for this appointment.

${job.business.name}
    `;
  }

  private getClientReminderEmail(job: any, formattedDate: string, formattedTime: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .job-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #4f46e5; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Reminder</h1>
            </div>
            <div class="content">
              <h2>Your cleaning appointment is coming up</h2>
              <div class="job-details">
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                ${job.client.address ? `<p><strong>Location:</strong> ${job.client.address}</p>` : ''}
              </div>
              <p>We look forward to serving you. If you need to reschedule or have any questions, please contact us.</p>
            </div>
            <div class="footer">
              <p>${job.business.name}</p>
              ${job.business.phone ? `<p>Phone: ${job.business.phone}</p>` : ''}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getClientReminderText(job: any, formattedDate: string, formattedTime: string): string {
    return `
Appointment Reminder

Your cleaning appointment is coming up

Date: ${formattedDate}
Time: ${formattedTime}
${job.client.address ? `Location: ${job.client.address}` : ''}

We look forward to serving you. If you need to reschedule or have any questions, please contact us.

${job.business.name}
${job.business.phone ? `Phone: ${job.business.phone}` : ''}
    `;
  }

  // Manual trigger for testing
  async sendRemindersNow() {
    await this.sendJobReminders();
  }
}
