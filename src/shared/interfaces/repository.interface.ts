import { Prisma } from '@prisma/client';

/**
 * Generic Repository Interface
 * Base interface for repository pattern
 */
export interface IRepository<T, TCreate, TUpdate, TWhere = Prisma.JsonObject> {
  /**
   * Create a new entity
   */
  create(data: TCreate): Promise<T>;

  /**
   * Find all entities
   */
  findAll(where?: TWhere): Promise<T[]>;

  /**
   * Find a single entity by ID
   */
  findOne(id: string, where?: TWhere): Promise<T | null>;

  /**
   * Update an entity
   */
  update(id: string, data: TUpdate): Promise<T>;

  /**
   * Delete an entity
   */
  delete(id: string): Promise<void>;

  /**
   * Count entities
   */
  count(where?: TWhere): Promise<number>;
}
