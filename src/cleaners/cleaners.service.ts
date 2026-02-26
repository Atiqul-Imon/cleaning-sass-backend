import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessService } from '../business/business.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

const INVITE_EXPIRY_HOURS = 168; // 7 days

@Injectable()
export class CleanersService {
  constructor(
    private prisma: PrismaService,
    private businessService: BusinessService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Create a cleaner account and link to business, or create an invite link
   */
  async createCleaner(
    ownerId: string,
    email: string,
    name?: string,
    method: 'password' | 'invite' = 'password',
  ) {
    // Get owner's business
    const business = await this.businessService.findByUserId(ownerId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Enforce cleaner limit from subscription plan
    await this.checkCleanerLimit(business.id, 'add');

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

      // Update existing user's name if provided
      if (name && name.trim()) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { name: name.trim() },
        });
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
              name: true,
              role: true,
              createdAt: true,
            },
          },
        },
      });

      return businessCleaner;
    }

    // For security: always use invite link. Temp password would expose credentials in API response.
    if (method === 'invite') {
      return this.createInvite(ownerId, email, name);
    }

    // method === 'password' → use invite flow instead (no password in response)
    return this.createInvite(ownerId, email, name);
  }

  /**
   * Get all cleaners for a business
   */
  async getCleaners(ownerId: string) {
    const business = await this.businessService.findByUserId(ownerId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const businessCleaners = await this.prisma.businessCleaner.findMany({
      where: {
        businessId: business.id,
      },
      include: {
        cleaner: {
          select: {
            id: true,
            email: true,
            name: true,
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
          name: bc.cleaner.name ?? undefined,
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
   * Get a single cleaner by ID (owner only)
   */
  async getCleanerById(ownerId: string, cleanerId: string) {
    const business = await this.businessService.findByUserId(ownerId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const businessCleaner = await this.prisma.businessCleaner.findUnique({
      where: {
        businessId_cleanerId: {
          businessId: business.id,
          cleanerId,
        },
      },
      include: {
        cleaner: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!businessCleaner) {
      throw new NotFoundException('Cleaner not found in this business');
    }

    const totalJobs = await this.prisma.job.count({
      where: {
        businessId: business.id,
        cleanerId,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayJobs = await this.prisma.job.count({
      where: {
        businessId: business.id,
        cleanerId,
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    return {
      id: businessCleaner.id,
      cleanerId: businessCleaner.cleanerId,
      email: businessCleaner.cleaner.email,
      name: businessCleaner.cleaner.name ?? undefined,
      role: businessCleaner.cleaner.role,
      status: businessCleaner.status,
      totalJobs,
      todayJobs,
      createdAt: businessCleaner.createdAt,
      activatedAt: businessCleaner.activatedAt,
    };
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
    if (!business) {
      throw new NotFoundException('Business not found');
    }

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
    if (!business) {
      throw new NotFoundException('Business not found');
    }

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
   * Check if business can add another cleaner based on subscription plan
   * SOLO: 1 cleaner (FREE), TEAM: 15, BUSINESS: 100
   */
  private async checkCleanerLimit(businessId: string, action: 'add') {
    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
    });
    const planType = subscription?.planType ?? 'SOLO';
    const limit = this.subscriptionsService.getCleanerLimit(planType);

    const currentCount = await this.prisma.businessCleaner.count({
      where: {
        businessId,
        status: 'ACTIVE',
      },
    });

    if (action === 'add' && currentCount >= limit) {
      const planNames: Record<string, string> = {
        SOLO: 'Solo (FREE - 1 staff, 20 jobs/mo)',
        TEAM: 'Team (£14.99/mo - up to 15 staff)',
        BUSINESS: 'Business (£99.99/mo - up to 100 staff)',
      };
      throw new BadRequestException(
        `Your ${planNames[planType] || planType} plan allows up to ${limit} staff. Upgrade your plan to add more cleaners.`,
      );
    }
  }

  /**
   * Create an invite link for a cleaner to sign up (Google or email)
   */
  async createInvite(ownerId: string, email: string, name?: string) {
    const business = await this.businessService.findByUserId(ownerId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Enforce cleaner limit from subscription plan
    await this.checkCleanerLimit(business.id, 'add');

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
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
      if (existingUser.role === 'OWNER') {
        throw new BadRequestException('Cannot add an owner as a cleaner');
      }
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    await this.prisma.cleanerInvite.create({
      data: {
        email,
        name: name || null,
        businessId: business.id,
        invitedBy: ownerId,
        token,
        expiresAt,
      },
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/accept-invite?token=${token}`;

    return {
      inviteLink,
      email,
      expiresAt,
      message: 'Share this link with the staff member. They can sign up with Google or email.',
    };
  }

  /**
   * Validate invite token (public - no auth)
   */
  async getInviteByToken(token: string) {
    const invite = await this.prisma.cleanerInvite.findUnique({
      where: { token },
      include: {
        business: {
          select: { id: true, name: true },
        },
      },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new NotFoundException('Invalid or expired invite');
    }
    return {
      email: invite.email,
      businessName: invite.business.name,
      businessId: invite.businessId,
    };
  }

  /**
   * Accept invite - link authenticated user to business as cleaner
   */
  async acceptInvite(userId: string, token: string) {
    const invite = await this.prisma.cleanerInvite.findUnique({
      where: { token },
      include: { business: true },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new NotFoundException('Invalid or expired invite');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new BadRequestException(
        `This invite was sent to ${invite.email}. Please sign in with that email.`,
      );
    }

    const hasBusiness = await this.prisma.business.findUnique({
      where: { userId },
    });
    if (user.role === 'OWNER' && hasBusiness) {
      throw new BadRequestException(
        'You already have an owner account. Cannot accept a cleaner invite.',
      );
    }

    const existingLink = await this.prisma.businessCleaner.findUnique({
      where: {
        businessId_cleanerId: {
          businessId: invite.businessId,
          cleanerId: userId,
        },
      },
    });
    if (existingLink) {
      throw new ConflictException('You are already on this team');
    }

    await this.prisma.user.upsert({
      where: { id: userId },
      update: { role: 'CLEANER' },
      create: { id: userId, email: user.email, role: 'CLEANER' },
    });

    await this.prisma.businessCleaner.create({
      data: {
        businessId: invite.businessId,
        cleanerId: userId,
        status: 'ACTIVE',
        invitedBy: invite.invitedBy,
        activatedAt: new Date(),
      },
    });

    await this.prisma.cleanerInvite.delete({ where: { id: invite.id } });

    return {
      success: true,
      businessName: invite.business.name,
      message: `You've joined ${invite.business.name}.`,
    };
  }

  /**
   * Leave team - cleaner removes themselves from the business
   */
  async leaveTeam(cleanerId: string) {
    const link = await this.prisma.businessCleaner.findFirst({
      where: { cleanerId, status: 'ACTIVE' },
      include: { business: true },
    });
    if (!link) {
      throw new NotFoundException('You are not linked to any business');
    }

    await this.prisma.businessCleaner.delete({ where: { id: link.id } });

    return {
      success: true,
      message: `You've left ${link.business.name}.`,
    };
  }
}
