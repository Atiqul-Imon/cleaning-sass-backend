import { Injectable } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Injectable()
export class ExportService {
  constructor(private reportsService: ReportsService) {}

  async exportToCSV(
    userId: string,
    startDate: Date,
    endDate: Date,
    type: 'jobs' | 'invoices' | 'all',
  ): Promise<string> {
    const report = await this.reportsService.getBusinessReport(userId, startDate, endDate);

    let csv = '';

    if (type === 'jobs' || type === 'all') {
      csv += 'Jobs Report\n';
      csv += `Period: ${startDate.toLocaleDateString('en-GB')} to ${endDate.toLocaleDateString('en-GB')}\n\n`;
      csv += 'Date,Client,Type,Status,Cleaner,Amount\n';

      report.jobs.forEach((job) => {
        const invoice = job.invoice;
        const amount = invoice ? Number(invoice.totalAmount).toFixed(2) : 'N/A';
        csv += `${new Date(job.scheduledDate).toLocaleDateString('en-GB')},${job.client.name},${job.type},${job.status},${job.cleanerId || 'Unassigned'},£${amount}\n`;
      });

      csv += '\n';
    }

    if (type === 'invoices' || type === 'all') {
      csv += 'Invoices Report\n';
      csv += `Period: ${startDate.toLocaleDateString('en-GB')} to ${endDate.toLocaleDateString('en-GB')}\n\n`;
      csv += 'Invoice Number,Client,Amount,Status,Due Date,Paid Date\n';

      report.invoices.forEach((invoice) => {
        csv += `${invoice.invoiceNumber},${invoice.client.name},£${Number(invoice.totalAmount).toFixed(2)},${invoice.status},${new Date(invoice.dueDate).toLocaleDateString('en-GB')},${invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('en-GB') : 'N/A'}\n`;
      });

      csv += '\n';
    }

    if (type === 'all') {
      csv += 'Summary\n';
      csv += `Total Jobs,${report.summary.totalJobs}\n`;
      csv += `Completed Jobs,${report.summary.completedJobs}\n`;
      csv += `Total Clients,${report.summary.totalClients}\n`;
      csv += `Total Revenue,£${report.summary.totalRevenue.toFixed(2)}\n`;
      csv += `Unpaid Invoices,${report.summary.unpaidInvoices}\n`;
      csv += `Unpaid Amount,£${report.summary.unpaidAmount.toFixed(2)}\n`;
    }

    return csv;
  }
}
