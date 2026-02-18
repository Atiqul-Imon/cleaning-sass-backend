/**
 * Client Entity
 * Domain model representing a client
 */
export interface ClientEntity {
  id: string;
  businessId: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: {
    accessInfo?: string;
    keySafe?: string;
    alarmCode?: string;
    pets?: string;
    preferences?: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Client with relations
 */
export interface ClientWithRelations extends ClientEntity {
  business?: {
    id: string;
    name: string;
  };
  jobs?: Array<{
    id: string;
    type: string;
    scheduledDate: Date;
    status: string;
  }>;
}



