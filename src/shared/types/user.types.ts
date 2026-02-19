/**
 * User types for authentication and authorization
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'OWNER' | 'CLEANER' | 'ADMIN';
}

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
  userRole?: 'OWNER' | 'CLEANER' | 'ADMIN';
  role?: 'OWNER' | 'CLEANER' | 'ADMIN';
}
