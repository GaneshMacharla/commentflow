export interface AppConfig {
  metaAppId: string;
  metaAppSecret: string;
  webhookVerifyToken: string;
  instagramAccessToken?: string;
  instagramAccountId?: string;
  tokenEncryptionKey?: string;
  appUrl: string;
  mockInstagram: boolean;
  queue: {
    concurrency: number;
    maxRetries: number;
    batchSize: number;
    pollIntervalMs: number;
    rateLimitPerSec: number;
  };
}

export function getConfig(): AppConfig {
  const isMock =
    process.env.MOCK_INSTAGRAM === 'true' ||
    process.env.MOCK_INSTAGRAM === '1' ||
    process.env.NODE_ENV === 'test';

  return {
    metaAppId:
      process.env.META_APP_ID ||
      process.env.INSTAGRAM_APP_ID ||
      '',
    metaAppSecret:
      process.env.META_APP_SECRET ||
      process.env.INSTAGRAM_APP_SECRET ||
      '',
    webhookVerifyToken:
      process.env.WEBHOOK_VERIFY_TOKEN ||
      process.env.INSTAGRAM_VERIFY_TOKEN ||
      process.env.META_VERIFY_TOKEN ||
      'commentflow_verify_token_2026',
    instagramAccessToken:
      process.env.INSTAGRAM_ACCESS_TOKEN ||
      process.env.META_ACCESS_TOKEN ||
      undefined,
    instagramAccountId:
      process.env.INSTAGRAM_ACCOUNT_ID ||
      process.env.META_ACCOUNT_ID ||
      undefined,
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
    appUrl: (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
    mockInstagram: isMock,
    queue: {
      concurrency: Math.max(1, parseInt(process.env.QUEUE_CONCURRENCY || '5', 10)),
      maxRetries: Math.max(1, parseInt(process.env.QUEUE_MAX_RETRIES || '5', 10)),
      batchSize: Math.max(1, parseInt(process.env.QUEUE_BATCH_SIZE || '25', 10)),
      pollIntervalMs: Math.max(100, parseInt(process.env.QUEUE_POLL_INTERVAL_MS || '1000', 10)),
      rateLimitPerSec: Math.max(1, parseInt(process.env.RATE_LIMIT_PER_SEC || '5', 10)),
    },
  };
}
