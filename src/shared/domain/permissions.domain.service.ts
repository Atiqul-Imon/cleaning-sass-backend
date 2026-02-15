import { Injectable } from '@nestjs/common';

export type UserRole = 'OWNER' | 'CLEANER' | 'ADMIN';

/**
 * Permissions Domain Service
 * Contains business logic for permissions and access control
 */
@Injectable()
export class PermissionsDomainService {
  /**
   * Check if user can access jobs
   */
  canAccessJobs(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN' || role === 'CLEANER';
  }

  /**
   * Check if user can create jobs
   */
  canCreateJobs(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  /**
   * Check if user can view all jobs (not just assigned)
   */
  canViewAllJobs(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  /**
   * Check if user can edit jobs
   */
  canEditJobs(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  /**
   * Check if user can delete jobs
   */
  canDeleteJobs(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  /**
   * Check if user can assign cleaners to jobs
   */
  canAssignCleaners(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  /**
   * Check if user can access clients
   */
  canAccessClients(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN' || role === 'CLEANER';
  }

  /**
   * Check if user can create clients
   */
  canCreateClients(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  /**
   * Check if user can edit clients
   */
  canEditClients(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  /**
   * Check if user can delete clients
   */
  canDeleteClients(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  /**
   * Check if user can access invoices
   */
  canAccessInvoices(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  /**
   * Check if user can create invoices
   */
  canCreateInvoices(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  /**
   * Check if user can edit invoices
   */
  canEditInvoices(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  /**
   * Check if cleaner can view a specific job
   */
  canCleanerViewJob(role: UserRole, jobCleanerId?: string, userId?: string): boolean {
    if (role !== 'CLEANER') return false;
    return jobCleanerId === userId;
  }

  /**
   * Check if user can update job status
   */
  canUpdateJobStatus(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN' || role === 'CLEANER';
  }

  /**
   * Check if user can upload job photos
   */
  canUploadJobPhotos(role?: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN' || role === 'CLEANER';
  }
}

