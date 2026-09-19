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

  constructor(error: GraphApiError) {
    super(error.message);
    this.name = 'MetaApiError';
    this.code = error.code;
    this.subcode = error.error_subcode;
    this.type = error.type;
  }
}

/**
 * Universal fetch wrapper for Meta Graph API with error parsing.
 */
export async function graphApiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const err = data.error as GraphApiError;
    throw new MetaApiError(err || {
      message: `Meta API HTTP ${response.status} Error`,
      code: response.status,
      type: 'HTTP_ERROR',
    });
  }

  return data as T;
}
