import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessService } from '../business/business.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { ClientsRepository } from './repositories/clients.repository';
import { ClientDomainService } from './domain/client.domain.service';
import { BusinessIdDomainService } from '../shared/domain/business-id.domain.service';
import { IClientsService } from './interfaces/clients.service.interface';
import { ClientEntity, ClientWithRelations } from './entities/client.entity';

@Injectable()
export class ClientsService implements IClientsService {
  constructor(
    private prisma: PrismaService,
    private clientsRepository: ClientsRepository,
    private businessService: BusinessService,
    private clientDomainService: ClientDomainService,
    private businessIdService: BusinessIdDomainService,
  ) {}

  async create(userId: string, data: CreateClientDto): Promise<ClientEntity> {
    // Validate using domain service
    const validation = this.clientDomainService.validateCreateClient(data);
    if (!validation.valid) {
      throw new Error(validation.errors?.join(', ') || 'Validation failed');
    }

    // Get business ID
    const business = await this.businessService.findByUserId(userId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Transform data using domain service
    const clientData = this.clientDomainService.transformClientData(data, business.id);

    return this.clientsRepository.create(clientData);
  }

  async findAll(
    userId: string,
    userRole?: string,
    pagination?: { page?: number; limit?: number },
  ): Promise<{ data: ClientWithRelations[]; pagination: any } | ClientWithRelations[]> {
    try {
      const businessId = await this.businessIdService.getBusinessId(userId, userRole as any);

      // If pagination is requested, return paginated response
      if (pagination?.page || pagination?.limit) {
        const page = pagination.page || 1;
        const limit = Math.min(pagination.limit || 20, 100); // Max 100 items per page
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
          this.clientsRepository.findAllWithRelations({ businessId }, { skip, take: limit }),
          this.clientsRepository.count({ businessId }),
        ]);

        return {
          data,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        };
      }

      // Return all results (backward compatibility)
      return this.clientsRepository.findAllWithRelations({ businessId });
    } catch {
      // If business doesn't exist yet, return empty array
      return pagination
        ? {
            data: [],
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          }
        : [];
    }
  }

  async findOne(userId: string, clientId: string, userRole?: string): Promise<ClientWithRelations> {
    const businessId = await this.businessIdService.getBusinessId(userId, userRole as any);

    const client = await this.clientsRepository.findOneWithRelations(clientId, {
      businessId,
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async update(
    userId: string,
    clientId: string,
    data: UpdateClientDto,
    userRole?: string,
  ): Promise<ClientEntity> {
    // Verify access
    await this.findOne(userId, clientId, userRole);

    // Validate using domain service
    const validation = this.clientDomainService.validateUpdateClient(data);
    if (!validation.valid) {
      throw new Error(validation.errors?.join(', ') || 'Validation failed');
    }

    // Transform data using domain service
    const updateData = this.clientDomainService.transformClientUpdateData(data);

    return this.clientsRepository.update(clientId, updateData);
  }

  async remove(userId: string, clientId: string, userRole?: string): Promise<void> {
    // Verify access
    await this.findOne(userId, clientId, userRole);

    await this.clientsRepository.delete(clientId);
  }

  async getJobHistory(userId: string, clientId: string, userRole?: string) {
    // Verify access
    await this.findOne(userId, clientId, userRole);

    const whereClause: Prisma.JobWhereInput = { clientId };

    // Cleaners only see their assigned jobs for this client
    if (userRole === 'CLEANER') {
      whereClause.cleanerId = userId;
    }

    return this.prisma.job.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        frequency: true,
        scheduledDate: true,
        scheduledTime: true,
        status: true,
        reminderEnabled: true,
        reminderTime: true,
        reminderSent: true,
        createdAt: true,
        updatedAt: true,
        cleanerId: true,
        invoice:
          userRole === 'OWNER'
            ? {
                select: {
                  id: true,
                  invoiceNumber: true,
                  amount: true,
                  status: true,
                },
              }
            : false, // Cleaners can't see invoices
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }
}
