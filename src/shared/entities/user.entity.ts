/**
 * User Entity
 * Domain model representing a user
 */
export interface UserEntity {
  id: string;
  email: string;
  role: 'OWNER' | 'CLEANER' | 'ADMIN';
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * User with business relation
 */
export interface UserWithBusiness extends UserEntity {
  business?: {
    id: string;
    name: string;
  };
}



