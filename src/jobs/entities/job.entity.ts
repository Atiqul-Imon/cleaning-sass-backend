/**
 * Job Entity
 * Domain model representing a cleaning job
 */
export interface JobEntity {
  id: string;
  businessId: string;
  clientId: string;
  cleanerId?: string | null;
  type: 'ONE_OFF' | 'RECURRING';
  frequency?: 'WEEKLY' | 'BI_WEEKLY' | null;
  scheduledDate: Date;
  scheduledTime?: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  reminderEnabled: boolean;
  reminderTime?: string | null;
  reminderSent?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Job with relations
 */
export interface JobWithRelations extends JobEntity {
  client?: {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
  };
  cleaner?: {
    id: string;
    email: string;
  } | null;
  business?: {
    id: string;
    name: string;
  };
  checklist?: Array<{
    id: string;
    itemText: string;
    completed: boolean;
  }>;
  photos?: Array<{
    id: string;
    imageUrl: string;
    photoType: 'BEFORE' | 'AFTER';
    timestamp: Date;
  }>;
  invoice?: {
    id: string;
    invoiceNumber: string;
  } | null;
}
