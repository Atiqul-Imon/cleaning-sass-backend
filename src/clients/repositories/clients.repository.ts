import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ClientEntity, ClientWithRelations } from '../entities/client.entity';
import { IRepository } from '../../shared/interfaces/repository.interface';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';

/**
 * Clients Repository
 * Data access layer for clients
 * Implements repository pattern to separate data access from business logic
 */
@Injectable()
export class ClientsRepository implements IRepository<
  ClientEntity,
  CreateClientDto & { businessId: string },
  UpdateClientDto,
  Prisma.ClientWhereInput
> {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateClientDto & { businessId: string }): Promise<ClientEntity> {
    return this.prisma.client.create({
      data,
    }) as Promise<ClientEntity>;
  }

  async findAll(where?: Prisma.ClientWhereInput): Promise<ClientEntity[]> {
    return this.prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    }) as Promise<ClientEntity[]>;
  }

  async findOne(id: string, where?: Prisma.ClientWhereInput): Promise<ClientEntity | null> {
    return this.prisma.client.findFirst({
      where: {
        id,
        ...where,
      },
    }) as Promise<ClientEntity | null>;
  }

  async findOneWithRelations(
    id: string,
    where?: Prisma.ClientWhereInput,
  ): Promise<ClientWithRelations | null> {
    return this.prisma.client.findFirst({
      where: {
        id,
        ...where,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        jobs: {
          select: {
            id: true,
            type: true,
            scheduledDate: true,
            status: true,
          },
          orderBy: { scheduledDate: 'desc' },
          take: 10,
        },
      },
    }) as Promise<ClientWithRelations | null>;
  }

  async findAllWithRelations(where?: Prisma.ClientWhereInput): Promise<ClientWithRelations[]> {
    return this.prisma.client.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<ClientWithRelations[]>;
  }

  async update(id: string, data: UpdateClientDto): Promise<ClientEntity> {
    return this.prisma.client.update({
      where: { id },
      data,
    }) as Promise<ClientEntity>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.ClientWhereInput): Promise<number> {
    return this.prisma.client.count({
      where,
    });
  }
}
