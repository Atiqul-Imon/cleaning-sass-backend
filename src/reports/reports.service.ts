import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessService } from '../business/business.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private businessService: BusinessService,
  ) {}

  async getBusinessReport(userId: string, startDate: Date, endDate: Date) {
    const business = await this.businessService.findByUserId(userId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const jobs = await this.prisma.job.findMany({
      where: {
        businessId: business.id,
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        client: true,
        invoice: true,
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId: business.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        client: true,
        job: true,
      },
    });

    const totalRevenue = invoices
      .filter((inv) => inv.status === 'PAID')
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter((j) => j.status === 'COMPLETED').length;
    const totalClients = new Set(jobs.map((j) => j.clientId)).size;
    const unpaidInvoices = invoices.filter((inv) => inv.status === 'UNPAID').length;
    const unpaidAmount = invoices
      .filter((inv) => inv.status === 'UNPAID')
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalJobs,
        completedJobs,
        totalClients,
        totalRevenue,
        unpaidInvoices,
        unpaidAmount,
      },
      jobs,
      invoices,
    };
  }

  async getClientReport(userId: string, clientId: string) {
    const business = await this.businessService.findByUserId(userId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        businessId: business.id,
      },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    const jobs = await this.prisma.job.findMany({
      where: {
        clientId,
        businessId: business.id,
      },
      include: {
        invoice: true,
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    const totalSpent = jobs
      .filter((j) => j.invoice && j.invoice.status === 'PAID')
      .reduce((sum, j) => sum + (j.invoice ? Number(j.invoice.totalAmount) : 0), 0);

    return {
      client,
      totalJobs: jobs.length,
      completedJobs: jobs.filter((j) => j.status === 'COMPLETED').length,
      totalSpent,
      jobs,
    };
  }
}
