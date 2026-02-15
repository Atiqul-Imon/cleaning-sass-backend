import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessService } from '../../business/business.service';
import { UserRole } from './permissions.domain.service';

/**
 * Business ID Domain Service
 * Handles business ID resolution for different user roles
 * Extracted to avoid duplication across services
 */
@Injectable()
export class BusinessIdDomainService {
  constructor(
    private prisma: PrismaService,
    private businessService: BusinessService,
  ) {}

  /**
   * Get business ID for a user based on their role
   */
  async getBusinessId(userId: string, userRole?: UserRole): Promise<string> {
    if (userRole === 'CLEANER') {
      // Get cleaner's business from BusinessCleaner
      const businessCleaner = await this.prisma.businessCleaner.findFirst({
        where: {
          cleanerId: userId,
          status: 'ACTIVE',
        },
        select: {
          businessId: true,
        },
      });

      if (!businessCleaner) {
        throw new Error('No business assignment found for cleaner');
      }

      return businessCleaner.businessId;
    }

    // For OWNER and ADMIN, get business from user
    const business = await this.businessService.findByUserId(userId);
    return business.id;
  }

  /**
   * Get business ID for a user (returns null if not found instead of throwing)
   */
  async getBusinessIdOrNull(userId: string, userRole?: UserRole): Promise<string | null> {
    try {
      return await this.getBusinessId(userId, userRole);
    } catch {
      return null;
    }
  }
}

