/**
 * Job Checklist Item Entity
 */
export interface JobChecklistItemEntity {
  id: string;
  jobId: string;
  itemText: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
