import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PdfService } from './pdf.service';
import { InvoiceDomainService } from './domain/invoice.domain.service';
import { JobsModule } from '../jobs/jobs.module';
import { BusinessModule } from '../business/business.module';
import { AuthModule } from '../auth/auth.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, JobsModule, BusinessModule, AuthModule, WhatsAppModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, PdfService, InvoiceDomainService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
