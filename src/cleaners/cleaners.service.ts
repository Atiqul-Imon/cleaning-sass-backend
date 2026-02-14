import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../auth/supabase.service';
import { BusinessService } from '../business/business.service';

@Injectable()
export class CleanersService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
    private businessService: BusinessService,
  ) {}

  /**
   * Create a cleaner account and link to business
   */
  async createCleaner(ownerId: string, email: string, name?: string) {
    // Get owner's business
    const business = await this.businessService.findByUserId(ownerId);

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Check if already linked to this business
      const existingLink = await this.prisma.businessCleaner.findUnique({
        where: {
          businessId_cleanerId: {
            businessId: business.id,
            cleanerId: existingUser.id,
          },
        },
      });

      if (existingLink) {
        throw new ConflictException('Cleaner is already linked to this business');
      }

      // If user exists but not linked, check if they're an owner
      if (existingUser.role === 'OWNER') {
        throw new BadRequestException('Cannot add an owner as a cleaner');
      }

      // Link existing user to business
      const businessCleaner = await this.prisma.businessCleaner.create({
        data: {
          businessId: business.id,
          cleanerId: existingUser.id,
          status: 'ACTIVE',
          invitedBy: ownerId,
          activatedAt: new Date(),
        },
        include: {
          cleaner: {
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
        },
      });

      return businessCleaner;
    }

    // Generate a secure random password
    const tempPassword = this.generateTempPassword();

    // Create user in Supabase Auth
    const adminClient = this.supabaseService.getAdminClient();
    const { data: supabaseData, error: supabaseError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name || email.split('@')[0],
      },
    });

    if (supabaseError || !supabaseData.user) {
      throw new BadRequestException(`Failed to create user: ${supabaseError?.message || 'Unknown error'}`);
    }

    // Create user in our database with CLEANER role
    const user = await this.prisma.user.create({
      data: {
        id: supabaseData.user.id,
        email: supabaseData.user.email!,
        role: 'CLEANER',
      },
    });

    // Link cleaner to business
    const businessCleaner = await this.prisma.businessCleaner.create({
      data: {
        businessId: business.id,
        cleanerId: user.id,
        status: 'ACTIVE',
        invitedBy: ownerId,
        activatedAt: new Date(),
      },
      include: {
        cleaner: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    // TODO: Send welcome email with password
    // For now, return password in response (should be removed in production)
    return {
      ...businessCleaner,
      tempPassword, // Remove this in production, send via email instead
    };
  }

  /**
   * Get all cleaners for a business
   */
  async getCleaners(ownerId: string) {
    const business = await this.businessService.findByUserId(ownerId);

    const businessCleaners = await this.prisma.businessCleaner.findMany({
      where: {
        businessId: business.id,
      },
      include: {
        cleaner: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get job counts for each cleaner
    const cleanersWithStats = await Promise.all(
      businessCleaners.map(async (bc) => {
        const totalJobs = await this.prisma.job.count({
          where: {
            businessId: business.id,
            cleanerId: bc.cleanerId,
          },
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayJobs = await this.prisma.job.count({
          where: {
            businessId: business.id,
            cleanerId: bc.cleanerId,
            scheduledDate: {
              gte: today,
              lt: tomorrow,
            },
          },
        });

        return {
          id: bc.id,
          cleanerId: bc.cleanerId,
          email: bc.cleaner.email,
          role: bc.cleaner.role,
          status: bc.status,
          totalJobs,
          todayJobs,
          createdAt: bc.createdAt,
          activatedAt: bc.activatedAt,
        };
      }),
    );

    return cleanersWithStats;
  }

  /**
   * Get cleaner's business (for cleaner to see which business they work for)
   */
  async getCleanerBusiness(cleanerId: string) {
    const businessCleaner = await this.prisma.businessCleaner.findFirst({
      where: {
        cleanerId,
        status: 'ACTIVE',
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!businessCleaner) {
      throw new NotFoundException('No active business assignment found');
    }

    return businessCleaner.business;
  }

  /**
   * Deactivate a cleaner (soft delete)
   */
  async deactivateCleaner(ownerId: string, cleanerId: string) {
    const business = await this.businessService.findByUserId(ownerId);

    const businessCleaner = await this.prisma.businessCleaner.findUnique({
      where: {
        businessId_cleanerId: {
          businessId: business.id,
          cleanerId,
        },
      },
    });

    if (!businessCleaner) {
      throw new NotFoundException('Cleaner not found in this business');
    }

    return this.prisma.businessCleaner.update({
      where: {
        id: businessCleaner.id,
      },
      data: {
        status: 'INACTIVE',
      },
    });
  }

  /**
   * Remove a cleaner completely
   */
  async removeCleaner(ownerId: string, cleanerId: string) {
    const business = await this.businessService.findByUserId(ownerId);

    const businessCleaner = await this.prisma.businessCleaner.findUnique({
      where: {
        businessId_cleanerId: {
          businessId: business.id,
          cleanerId,
        },
      },
    });

    if (!businessCleaner) {
      throw new NotFoundException('Cleaner not found in this business');
    }

    // Delete the business-cleaner relationship
    await this.prisma.businessCleaner.delete({
      where: {
        id: businessCleaner.id,
      },
    });

    // Note: We don't delete the user account, just the business association
    // The user can still exist but won't have access to this business
    return { success: true };
  }

  /**
   * Generate a secure temporary password
   */
  private generateTempPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}





