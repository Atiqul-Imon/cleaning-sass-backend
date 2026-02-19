/**
 * Job Photo Entity
 */
export interface JobPhotoEntity {
  id: string;
  jobId: string;
  imageUrl: string;
  photoType: 'BEFORE' | 'AFTER';
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}
