import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessService } from '../business/business.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private businessService: BusinessService,
    private jobsService: JobsService,
  ) {}

  async createFromJob(userId: string, jobId: string, amount: number) {
    const business = await this.businessService.findByUserId(userId);
    const job = await this.jobsService.findOne(userId, jobId, 'OWNER');

    const vatAmount = business.vatEnabled ? amount * 0.2 : 0;
    const totalAmount = amount + vatAmount;

    const invoiceNumber = await this.generateInvoiceNumber(business.id);

    return this.prisma.invoice.create({
      data: {
        jobId: job.id,
        businessId: business.id,
        clientId: job.clientId,
        invoiceNumber,
        amount,
        vatAmount,
        totalAmount,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
  }

  private async generateInvoiceNumber(businessId: string): Promise<string> {
    const count = await this.prisma.invoice.count({
      where: { businessId },
    });
    return `INV-${String(count + 1).padStart(6, '0')}`;
  }

  async findAll(userId: string) {
    const business = await this.businessService.findByUserId(userId);

    return this.prisma.invoice.findMany({
      where: { businessId: business.id },
      include: {
        client: true,
        job: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, invoiceId: string) {
    const business = await this.businessService.findByUserId(userId);

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        businessId: business.id,
      },
      include: {
        client: true,
        job: {
          include: {
            checklist: true,
            photos: true,
          },
        },
        business: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return invoice;
  }

  async markAsPaid(userId: string, invoiceId: string, paymentMethod: string) {
    const business = await this.businessService.findByUserId(userId);

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        businessId: business.id,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paymentMethod: paymentMethod as any,
        paidAt: new Date(),
      },
    });
  }

  async getUnpaidCount(userId: string) {
    const business = await this.businessService.findByUserId(userId);

    return this.prisma.invoice.count({
      where: {
        businessId: business.id,
        status: 'UNPAID',
      },
    });
  }

  async getMonthlyEarnings(userId: string, month: number, year: number) {
    const business = await this.businessService.findByUserId(userId);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId: business.id,
        status: 'PAID',
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  }
}




