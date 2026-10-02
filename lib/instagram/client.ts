import { getConfig } from '../config';

const GRAPH_API_BASE = 'https://graph.instagram.com/v21.0';

export interface GraphApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export class MetaApiError extends Error {
  code: number;
  subcode?: number;
  type: string;
  status?: number;
  retryAfterSeconds?: number;
  isTransient: boolean;

  constructor(error: GraphApiError, status?: number, retryAfterSeconds?: number) {
    super(error.message);
    this.name = 'MetaApiError';
    this.code = error.code;
    this.subcode = error.error_subcode;
    this.type = error.type;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;

    // Determine if the error is temporary/retryable or permanent
    const isRateLimit = status === 429 || error.code === 4 || error.code === 17 || error.code === 32 || error.code === 613;
    const isTransientServer = (status !== undefined && status >= 500 && status < 600) || error.code === 1 || error.code === 2;
    this.isTransient = isRateLimit || isTransientServer;
  }
}

/**
 * Universal fetch wrapper for Meta Graph API with error parsing, Retry-After header detection,
 * and built-in Mock Mode.
 */
export async function graphApiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getConfig();

  // If mock mode is active, simulate success safely without making network call
  if (config.mockInstagram) {
    console.log(`[MOCK_INSTAGRAM] Simulating Meta API request to ${endpoint}`);
    if (endpoint.includes('/messages')) {
      return {
        recipient_id: 'mock_recipient_id',
        message_id: `mock_mid_${Date.now()}`,
      } as unknown as T;
    }
    if (endpoint.includes('/replies')) {
      return {
        id: `mock_reply_${Date.now()}`,
      } as unknown as T;
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  let retryAfterSeconds: number | undefined;
  const retryHeader = response.headers.get('retry-after');
  if (retryHeader) {
    const parsed = parseInt(retryHeader, 10);
    if (!isNaN(parsed) && parsed > 0) {
      retryAfterSeconds = parsed;
    }
  }

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    data = { error: { message: `HTTP ${response.status} Non-JSON Response`, code: response.status } };
  }

  if (!response.ok || data.error) {
    const err = (data.error || {
      message: `Meta API HTTP ${response.status} Error`,
      code: response.status,
      type: response.status === 429 ? 'RATE_LIMIT_ERROR' : 'HTTP_ERROR',
    }) as GraphApiError;

    throw new MetaApiError(err, response.status, retryAfterSeconds);
  }

  return data as T;
}
