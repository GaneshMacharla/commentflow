export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type DmStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface QueuedComment {
  id: string;
  instagramCommentId: string;
  instagramAccountId: string;
  commentText: string;
  username?: string | null;
  mediaId?: string | null;
  matchedKeyword?: string | null;
  processingStatus: ProcessingStatus;
  dmStatus: DmStatus;
  retryCount: number;
  nextRetryAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  processingStartedAt?: string | null;
  processedAt?: string | null;
}

export interface EnqueueCommentInput {
  commentId: string;
  instagramAccountId: string;
  commentText: string;
  username?: string;
  mediaId?: string;
}

export interface QueueProcessorOptions {
  batchSize?: number;
  concurrency?: number;
  maxRetries?: number;
  rateLimitPerSec?: number;
}
