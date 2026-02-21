import { Controller, Get, Post, Body, Param, UseGuards, Res, Query } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../shared/types/user.types';
import { InvoicesService } from './invoices.service';
import { PdfService } from './pdf.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { PaginationDto } from '../shared/dto/pagination.dto';

@Controller('invoices')
@UseGuards(AuthGuard, RolesGuard)
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private pdfService: PdfService,
  ) {}

  @Post('from-job/:jobId')
  @Roles('OWNER') // Only owners can create invoices
  async createFromJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Body('amount') amount: number,
  ) {
    return this.invoicesService.createFromJob(user.id, jobId, amount);
  }

  @Get()
  @Roles('OWNER') // Only owners can see invoices
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
    @Query('status') status?: 'PAID' | 'UNPAID',
  ) {
    return this.invoicesService.findAll(user.id, { ...pagination, status });
  }

  @Get(':id')
  @Roles('OWNER') // Only owners can see invoice details
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.invoicesService.findOne(user.id, id);
  }

  @Get(':id/pdf')
  @Roles('OWNER') // Only owners can download invoice PDF
  async downloadPDF(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findOne(user.id, id);
    const pdfBuffer = await this.pdfService.generateInvoicePDF(invoice as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  @Get(':id/whatsapp-link')
  @Roles('OWNER') // Only owners can send invoices via WhatsApp
  async getWhatsAppLink(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.invoicesService.getWhatsAppLink(user.id, id);
  }
}
