import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessService } from '../business/business.service';
import { JobsService } from '../jobs/jobs.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { InvoiceDomainService } from './domain/invoice.domain.service';
import { IInvoicesService } from './interfaces/invoices.service.interface';
import { InvoiceEntity, InvoiceWithRelations } from './entities/invoice.entity';

@Injectable()
export class InvoicesService implements IInvoicesService {
  constructor(
    private prisma: PrismaService,
    private businessService: BusinessService,
    private jobsService: JobsService,
    private whatsappService: WhatsAppService,
    private invoiceDomainService: InvoiceDomainService,
  ) {}

  async createFromJob(userId: string, jobId: string, amount: number): Promise<InvoiceEntity> {
    // Validate using domain service
    const validation = this.invoiceDomainService.validateCreateInvoice(amount);
    if (!validation.valid) {
      throw new Error(validation.errors?.join(', ') || 'Validation failed');
    }

    const business = await this.businessService.findByUserId(userId);
    const job = await this.jobsService.findOne(userId, jobId, 'OWNER');

    // Calculate amounts using domain service
    const vatAmount = this.invoiceDomainService.calculateVAT(amount, business.vatEnabled);
    const totalAmount = this.invoiceDomainService.calculateTotal(amount, business.vatEnabled);

    // Generate invoice number using domain service
    const invoiceCount = await this.prisma.invoice.count({
      where: { businessId: business.id },
    });
    const invoiceNumber = this.invoiceDomainService.generateInvoiceNumber(invoiceCount);

    // Calculate due date using domain service
    const dueDate = this.invoiceDomainService.calculateDueDate(30);

    const invoice = await this.prisma.invoice.create({
      data: {
        jobId: job.id,
        businessId: business.id,
        clientId: job.clientId,
        invoiceNumber,
        amount,
        vatAmount,
        totalAmount,
        dueDate,
      },
    });

    // Convert Prisma Decimal to number for entity
    return {
      ...invoice,
      amount: Number(invoice.amount),
      vatAmount: Number(invoice.vatAmount),
      totalAmount: Number(invoice.totalAmount),
    } as InvoiceEntity;
  }

  async findAll(userId: string): Promise<InvoiceWithRelations[]> {
    const business = await this.businessService.findByUserId(userId);

    const invoices = await this.prisma.invoice.findMany({
      where: { businessId: business.id },
      include: {
        client: true,
        job: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert Prisma Decimal to number
    return invoices.map((invoice) => ({
      ...invoice,
      amount: Number(invoice.amount),
      vatAmount: Number(invoice.vatAmount),
      totalAmount: Number(invoice.totalAmount),
    })) as InvoiceWithRelations[];
  }

  async findOne(userId: string, invoiceId: string): Promise<InvoiceWithRelations> {
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

    // Convert Prisma Decimal to number
    return {
      ...invoice,
      amount: Number(invoice.amount),
      vatAmount: Number(invoice.vatAmount),
      totalAmount: Number(invoice.totalAmount),
    } as InvoiceWithRelations;
  }

  async update(
    userId: string,
    invoiceId: string,
    data: { status?: 'PAID' | 'UNPAID'; paymentMethod?: 'BANK_TRANSFER' | 'CARD' | 'CASH' },
  ): Promise<InvoiceEntity> {
    // Validate using domain service
    const validation = this.invoiceDomainService.validateUpdateInvoice(data);
    if (!validation.valid) {
      throw new Error(validation.errors?.join(', ') || 'Validation failed');
    }

    await this.findOne(userId, invoiceId);

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ...data,
        ...(data.status === 'PAID' && { paidAt: new Date() }),
      },
    });

    // Convert Prisma Decimal to number
    return {
      ...updated,
      amount: Number(updated.amount),
      vatAmount: Number(updated.vatAmount),
      totalAmount: Number(updated.totalAmount),
    } as InvoiceEntity;
  }

  async markAsPaid(
    userId: string,
    invoiceId: string,
    paymentMethod: string,
  ): Promise<InvoiceEntity> {
    return this.update(userId, invoiceId, {
      status: 'PAID',
      paymentMethod: paymentMethod as 'BANK_TRANSFER' | 'CARD' | 'CASH',
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

  async getWhatsAppLink(
    userId: string,
    invoiceId: string,
  ): Promise<{ whatsappUrl: string | null; phoneNumber?: string }> {
    const invoice = await this.findOne(userId, invoiceId);

    if (!invoice.client?.phone) {
      return {
        whatsappUrl: null,
      };
    }

    const message = this.whatsappService.generateInvoiceMessage(invoice);
    const whatsappUrl = this.whatsappService.generateWhatsAppLink(invoice.client.phone, message);

    return {
      whatsappUrl,
      phoneNumber: invoice.client.phone || undefined,
    };
  }
}
