import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { addWeeks } from 'date-fns';

@Injectable()
export class RecurringJobsService {
  private readonly logger = new Logger(RecurringJobsService.name);

  constructor(private prisma: PrismaService) {}

  // Run daily at 2 AM to check for completed recurring jobs and create next occurrence
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleRecurringJobs() {
    this.logger.log('Starting recurring jobs automation...');

    try {
      // Find all completed recurring jobs that don't have a next occurrence scheduled
      const completedRecurringJobs = await this.prisma.job.findMany({
        where: {
          type: 'RECURRING',
          status: 'COMPLETED',
          frequency: {
            not: null,
          },
        },
        include: {
          client: true,
          business: true,
        },
      });

      this.logger.log(`Found ${completedRecurringJobs.length} completed recurring jobs to process`);

      for (const job of completedRecurringJobs) {
        if (!job.frequency) continue;

        // Check if next occurrence already exists (within next 2 weeks)
        const nextDate =
          job.frequency === 'WEEKLY'
            ? addWeeks(new Date(job.scheduledDate), 1)
            : addWeeks(new Date(job.scheduledDate), 2);

        const existingNextJob = await this.prisma.job.findFirst({
          where: {
            businessId: job.businessId,
            clientId: job.clientId,
            type: 'RECURRING',
            frequency: job.frequency,
            scheduledDate: {
              gte: new Date(nextDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days before
              lte: new Date(nextDate.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days after
            },
          },
        });

        // Only create if next occurrence doesn't exist and the completed job was completed recently (within last 7 days)
        const completedRecently = job.updatedAt && 
          new Date(job.updatedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

        if (!existingNextJob && completedRecently) {
          await this.prisma.job.create({
            data: {
              businessId: job.businessId,
              clientId: job.clientId,
              cleanerId: job.cleanerId,
              type: 'RECURRING',
              frequency: job.frequency,
              scheduledDate: nextDate,
              scheduledTime: job.scheduledTime,
              status: 'SCHEDULED',
            },
          });

          this.logger.log(
            `Created next occurrence for recurring job ${job.id} - scheduled for ${nextDate.toISOString()}`,
          );
        }
      }

      this.logger.log('Recurring jobs automation completed');
    } catch (error) {
      this.logger.error('Error in recurring jobs automation:', error);
    }
  }

  // Manual trigger for testing
  async processRecurringJobs() {
    await this.handleRecurringJobs();
  }
}








