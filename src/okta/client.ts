import type { Config } from '../config.js';
import { getAccessToken } from './oauthServiceApp.js';

// ============================================================================
// Error Types
// ============================================================================

export type ErrorType = 
  | 'api_error'
  | 'validation_error'
  | 'rate_limit_error'
  | 'network_error'
  | 'auth_error'
  | 'not_found_error'
  | 'unknown_error';

export interface OktaError {
  errorCode: string;
  errorSummary: string;
  errorLink?: string;
  errorId?: string;
  errorCauses?: Array<{ errorSummary: string }>;
}

export interface StructuredError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  errorCode?: string;
  errorId?: string;
  details?: string[];
  suggestion: string;
  retryAfterMs?: number;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
  timestamp: string;
}

export class OktaApiError extends Error {
  public readonly statusCode: number;
  public readonly oktaError?: OktaError;
  public readonly retryAfterMs?: number;
  public readonly rateLimitRemaining?: number;
  public readonly rateLimitReset?: number;

  constructor(
    statusCode: number,
    message: string,
    oktaError?: OktaError,
    rateLimitInfo?: { retryAfterMs?: number; remaining?: number; reset?: number }
  ) {
    super(message);
    this.name = 'OktaApiError';
    this.statusCode = statusCode;
    this.oktaError = oktaError;
    this.retryAfterMs = rateLimitInfo?.retryAfterMs;
    this.rateLimitRemaining = rateLimitInfo?.remaining;
    this.rateLimitReset = rateLimitInfo?.reset;
  }

  getErrorType(): ErrorType {
    if (this.statusCode === 429) return 'rate_limit_error';
    if (this.statusCode === 401 || this.statusCode === 403) return 'auth_error';
    if (this.statusCode === 404) return 'not_found_error';
    if (this.statusCode === 400 || this.statusCode === 422) return 'validation_error';
    return 'api_error';
  }

  toStructured(toolName?: string): StructuredError {
    const details = this.oktaError?.errorCauses?.map(c => c.errorSummary) || [];
    
    return {
      type: this.getErrorType(),
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.oktaError?.errorCode,
      errorId: this.oktaError?.errorId,
      details: details.length > 0 ? details : undefined,
      suggestion: getSuggestionForError(this.getErrorType(), this.statusCode),
      retryAfterMs: this.retryAfterMs,
      rateLimitRemaining: this.rateLimitRemaining,
      rateLimitReset: this.rateLimitReset,
      timestamp: new Date().toISOString(),
    };
  }
}

function getSuggestionForError(type: ErrorType, statusCode?: number): string {
  switch (type) {
    case 'rate_limit_error':
      return 'Rate limit exceeded. Wait for retryAfterMs before retrying, or reduce request frequency.';
    case 'auth_error':
      return 'Authentication failed. Verify OKTA_CLIENT_ID, OKTA_PRIVATE_KEY, and that required scopes are granted.';
    case 'not_found_error':
      return 'Resource not found. Verify the ID is correct using the corresponding list tool.';
    case 'validation_error':
      return 'Invalid request parameters. Check the details array for specific field errors.';
    case 'network_error':
      return 'Network error occurred. Check connectivity and OKTA_DOMAIN configuration.';
    case 'api_error':
      if (statusCode && statusCode >= 500) {
        return 'Okta server error. This is typically transient - retry after a brief delay.';
      }
      return 'API error occurred. Check the errorCode and details for more information.';
    default:
      return 'An unexpected error occurred. Check the error details and retry.';
  }
}

// ============================================================================
// Rate Limit Tracking
// ============================================================================

interface RateLimitState {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  lastUpdated: number;
}

let rateLimitState: RateLimitState | null = null;

function updateRateLimitState(headers: Headers): void {
  const limit = headers.get('X-Rate-Limit-Limit');
  const remaining = headers.get('X-Rate-Limit-Remaining');
  const reset = headers.get('X-Rate-Limit-Reset');

  if (limit && remaining && reset) {
    rateLimitState = {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
      lastUpdated: Date.now(),
    };
  }
}

function getRateLimitInfo(headers: Headers): { retryAfterMs?: number; remaining?: number; reset?: number } {
  const remaining = headers.get('X-Rate-Limit-Remaining');
  const reset = headers.get('X-Rate-Limit-Reset');
  
  const resetTime = reset ? parseInt(reset, 10) : undefined;
  const retryAfterMs = resetTime ? Math.max(0, resetTime * 1000 - Date.now()) + 1000 : undefined;

  return {
    retryAfterMs,
    remaining: remaining ? parseInt(remaining, 10) : undefined,
    reset: resetTime,
  };
}

async function proactiveRateLimitDelay(): Promise<void> {
  if (!rateLimitState) return;
  
  // If remaining is less than 10% of limit, add a small delay
  const threshold = Math.max(5, rateLimitState.limit * 0.1);
  if (rateLimitState.remaining < threshold) {
    const timeUntilReset = rateLimitState.reset * 1000 - Date.now();
    if (timeUntilReset > 0) {
      // Spread remaining requests across time until reset
      const delayMs = Math.min(timeUntilReset / Math.max(1, rateLimitState.remaining), 2000);
      await sleep(delayMs);
    }
  }
}

export function getRateLimitStatus(): RateLimitState | null {
  return rateLimitState;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextAfter?: string;
  nextLink?: string;
}

/**
 * Parse Link header for pagination
 */
function parseNextLink(linkHeader: string | null): string | undefined {
  if (!linkHeader) return undefined;

  const links = linkHeader.split(',');
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

/**
 * Extract 'after' cursor from a next link URL
 */
function extractAfterCursor(nextLink: string | undefined): string | undefined {
  if (!nextLink) return undefined;
  try {
    const url = new URL(nextLink);
    return url.searchParams.get('after') || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create an Okta API client with automatic auth and retry
 */
export function createOktaClient(config: Config) {
  const baseUrl = config.oktaDomain;

  async function request<T>(options: RequestOptions): Promise<T> {
    const { method = 'GET', path, query, body } = options;

    // Build URL with query params
    const url = new URL(path, baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      // Proactive rate limit delay
      await proactiveRateLimitDelay();

      try {
        const token = await getAccessToken(config);

        const response = await fetch(url.toString(), {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(config.timeoutMs),
        });

        // Update rate limit state from headers
        updateRateLimitState(response.headers);

        // Handle rate limiting
        if (response.status === 429) {
          const rateLimitInfo = getRateLimitInfo(response.headers);
          const waitMs = rateLimitInfo.retryAfterMs || Math.min(1000 * Math.pow(2, attempt), 30000);

          if (attempt < config.maxRetries) {
            await sleep(waitMs);
            continue;
          }

          // Final attempt failed - throw with rate limit info
          const responseText = await response.text();
          let oktaError: OktaError | undefined;
          try {
            oktaError = JSON.parse(responseText);
          } catch {
            // ignore
          }
          throw new OktaApiError(429, 'Rate limit exceeded', oktaError, rateLimitInfo);
        }

        // Handle server errors with retry
        if (response.status >= 500 && attempt < config.maxRetries) {
          await sleep(Math.min(1000 * Math.pow(2, attempt), 30000));
          continue;
        }

        // Parse response
        const responseText = await response.text();
        let responseData: unknown;

        try {
          responseData = responseText ? JSON.parse(responseText) : undefined;
        } catch {
          responseData = responseText;
        }

        if (!response.ok) {
          const oktaError = responseData as OktaError | undefined;
          const message =
            oktaError?.errorSummary || `Okta API error: ${response.status} ${response.statusText}`;
          const rateLimitInfo = getRateLimitInfo(response.headers);
          throw new OktaApiError(response.status, message, oktaError, rateLimitInfo);
        }

        return responseData as T;
      } catch (err) {
        lastError = err as Error;
        if (err instanceof OktaApiError) {
          throw err;
        }
        // Network/timeout errors
        if (attempt >= config.maxRetries) {
          if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
            throw new OktaApiError(0, `Request timeout after ${config.timeoutMs}ms`, undefined);
          }
          throw err;
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Make a request and return paginated response (with retry support)
   */
  async function paginatedRequest<T>(options: RequestOptions): Promise<PaginatedResponse<T>> {
    const { method = 'GET', path, query, body } = options;

    const url = new URL(path, baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      // Proactive rate limit delay
      await proactiveRateLimitDelay();

      try {
        const token = await getAccessToken(config);

        const response = await fetch(url.toString(), {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(config.timeoutMs),
        });

        // Update rate limit state from headers
        updateRateLimitState(response.headers);

        // Handle rate limiting
        if (response.status === 429) {
          const rateLimitInfo = getRateLimitInfo(response.headers);
          const waitMs = rateLimitInfo.retryAfterMs || Math.min(1000 * Math.pow(2, attempt), 30000);

          if (attempt < config.maxRetries) {
            await sleep(waitMs);
            continue;
          }

          const responseText = await response.text();
          let oktaError: OktaError | undefined;
          try {
            oktaError = JSON.parse(responseText);
          } catch {
            // ignore
          }
          throw new OktaApiError(429, 'Rate limit exceeded', oktaError, rateLimitInfo);
        }

        // Handle server errors with retry
        if (response.status >= 500 && attempt < config.maxRetries) {
          await sleep(Math.min(1000 * Math.pow(2, attempt), 30000));
          continue;
        }

        if (!response.ok) {
          const responseText = await response.text();
          let oktaError: OktaError | undefined;
          try {
            oktaError = JSON.parse(responseText);
          } catch {
            // ignore
          }
          const message =
            oktaError?.errorSummary || `Okta API error: ${response.status} ${response.statusText}`;
          const rateLimitInfo = getRateLimitInfo(response.headers);
          throw new OktaApiError(response.status, message, oktaError, rateLimitInfo);
        }

        const items = (await response.json()) as T[];
        const linkHeader = response.headers.get('Link');
        const nextLink = parseNextLink(linkHeader);
        const nextAfter = extractAfterCursor(nextLink);

        return {
          items,
          nextAfter,
          nextLink,
        };
      } catch (err) {
        lastError = err as Error;
        if (err instanceof OktaApiError) {
          throw err;
        }
        if (attempt >= config.maxRetries) {
          if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
            throw new OktaApiError(0, `Request timeout after ${config.timeoutMs}ms`, undefined);
          }
          throw err;
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  return {
    request,
    paginatedRequest,
  };
}

export type OktaClient = ReturnType<typeof createOktaClient>;
