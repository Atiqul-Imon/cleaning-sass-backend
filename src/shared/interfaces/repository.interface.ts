/**
 * Generic Repository Interface
 * Base interface for repository pattern
 */
export interface IRepository<T, TCreate, TUpdate> {
  /**
   * Create a new entity
   */
  create(data: TCreate): Promise<T>;

  /**
   * Find all entities
   */
  findAll(where?: any): Promise<T[]>;

  /**
   * Find a single entity by ID
   */
  findOne(id: string, where?: any): Promise<T | null>;

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
  count(where?: any): Promise<number>;
}

