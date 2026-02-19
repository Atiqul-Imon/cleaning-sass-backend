import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';
import { ClientEntity, ClientWithRelations } from '../entities/client.entity';

/**
 * Clients Service Interface
 * Defines the contract for ClientsService
 */
export interface IClientsService {
  /**
   * Create a new client
   */
  create(userId: string, data: CreateClientDto): Promise<ClientEntity>;

  /**
   * Find all clients for a user
   */
  findAll(userId: string): Promise<ClientWithRelations[]>;

  /**
   * Find a single client by ID
   */
  findOne(id: string, userId: string): Promise<ClientWithRelations>;

  /**
   * Update a client
   */
  update(id: string, userId: string, data: UpdateClientDto): Promise<ClientEntity>;

  /**
   * Delete a client
   */
  remove(id: string, userId: string): Promise<void>;
}
