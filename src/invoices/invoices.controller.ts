import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Res,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../shared/types/user.types';
import { InvoicesService } from './invoices.service';
import { PdfService } from './pdf.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

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
    @Body('dueDate') dueDate?: string, // Optional ISO date (yyyy-MM-dd)
  ) {
    return this.invoicesService.createFromJob(user.id, jobId, amount, dueDate);
  }

  @Get()
  @Roles('OWNER') // Only owners can see invoices
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInvoicesDto) {
    return this.invoicesService.findAll(user.id, {
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
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

  @Patch(':id')
  @Roles('OWNER')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(user.id, id, dto);
  }

  @Put(':id/mark-paid')
  @Roles('OWNER')
  async markAsPaid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('paymentMethod') paymentMethod: string,
  ) {
    return this.invoicesService.markAsPaid(user.id, id, paymentMethod);
  }

  @Delete(':id')
  @Roles('OWNER')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.invoicesService.delete(user.id, id);
    return { success: true };
  }
}
