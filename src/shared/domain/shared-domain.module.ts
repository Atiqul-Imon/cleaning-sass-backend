import { Module } from '@nestjs/common';
import { PermissionsDomainService } from './permissions.domain.service';
import { BusinessIdDomainService } from './business-id.domain.service';
import { BusinessModule } from '../../business/business.module';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Shared Domain Module
 * Contains shared domain services used across multiple feature modules
 */
@Module({
  imports: [PrismaModule, BusinessModule],
  providers: [PermissionsDomainService, BusinessIdDomainService],
  exports: [PermissionsDomainService, BusinessIdDomainService],
})
export class SharedDomainModule {}
