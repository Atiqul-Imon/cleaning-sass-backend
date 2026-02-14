import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PdfService } from './pdf.service';
import { JobsModule } from '../jobs/jobs.module';
import { BusinessModule } from '../business/business.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [JobsModule, BusinessModule, AuthModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, PdfService],
  exports: [InvoicesService],
})
export class InvoicesModule {}

