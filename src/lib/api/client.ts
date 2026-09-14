/**
 * API Client
 *
 * Centralized HTTP client for backend communication.
 * Handles authentication, error handling, and request formatting.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Active project ID (set by ProjectContext)
let activeProjectId: string = 'oslobygg';

export function setActiveProjectId(projectId: string) {
  activeProjectId = projectId;
}

export function getActiveProjectId(): string {
  return activeProjectId;
}

// CSRF token storage and fetching
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;
let csrfGeneration = 0;

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/csrf-token`, { credentials: 'include' });
  if (!response.ok) {
    if (response.status === 401) redirectToLogin();
    throw new ApiError(response.status, 'Kunne ikke bekrefte sesjonen.');
  }
  const data = await response.json();
  return data.csrfToken;
}

async function getCsrfToken(forceRefresh: boolean = false): Promise<string> {
  if (csrfToken && !forceRefresh) {
    return csrfToken;
  }

  // Clear old token if forcing refresh
  if (forceRefresh) {
    clearCsrfToken();
  }

  // Prevent multiple simultaneous fetches
  if (!csrfTokenPromise) {
    const generation = csrfGeneration;
    const pending = fetchCsrfToken()
      .then((token) => {
        if (generation === csrfGeneration) csrfToken = token;
        return token;
      })
      .finally(() => {
        if (csrfTokenPromise === pending) csrfTokenPromise = null;
      });
    csrfTokenPromise = pending;
  }

  return csrfTokenPromise;
}

// Clear CSRF token (used on 403 errors to force refresh)
export function clearCsrfToken() {
  csrfGeneration++;
  csrfToken = null;
  csrfTokenPromise = null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * HTTP status codes that indicate transient errors worth retrying.
 * - 408: Request Timeout
 * - 429: Too Many Requests (rate limited)
 * - 500: Internal Server Error
 * - 502: Bad Gateway
 * - 503: Service Unavailable
 * - 504: Gateway Timeout
 */
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Check if an error is retryable (transient network/server issue).
 *
 * Used by React Query's retry function to decide whether to retry failed requests.
 * Returns true for:
 * - Network errors (status 0)
 * - Server errors (5xx)
 * - Rate limiting (429)
 * - Timeouts (408)
 *
 * Returns false for:
 * - Client errors (4xx except 408, 429)
 * - Auth errors (401, 403)
 * - Not found (404)
 * - Validation errors (400, 422)
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors (fetch failed completely)
  if (error instanceof TypeError) {
    return true;
  }

  // ApiError with retryable status code
  if (error instanceof ApiError) {
    return RETRYABLE_STATUS_CODES.includes(error.status);
  }

  // Unknown errors - don't retry to be safe
  return false;
}

/**
 * Generic API fetch wrapper with error handling
 */
export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  // Snapshot the target before waiting for CSRF; navigation may change the default.
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-Project-ID': activeProjectId,
  });
  new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
  const method = options?.method?.toUpperCase() ?? 'GET';
  const mutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  try {
    if (mutation) headers.set('X-CSRF-Token', await getCsrfToken());
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(url, { ...options, credentials: 'include', headers });
      const contentType = response.headers.get('content-type');
      const data: unknown =
        contentType && (contentType.includes('application/json') || contentType.includes('+json'))
          ? await response.json()
          : await response.text();
      if (response.ok) return data as T;

      if (response.status === 401) redirectToLogin();
      const detail =
        typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : undefined;
      // Only an explicit CSRF rejection is safe to replay automatically.
      if (
        attempt === 0 &&
        mutation &&
        response.status === 403 &&
        detail?.error === 'CSRF validation failed'
      ) {
        headers.set('X-CSRF-Token', await getCsrfToken(true));
        continue;
      }
      const message =
        typeof detail?.message === 'string'
          ? detail.message
          : typeof data === 'string'
            ? data
            : `HTTP ${response.status}: ${response.statusText}`;
      throw new ApiError(response.status, message, data);
    }
    throw new ApiError(403, 'Kunne ikke bekrefte sesjonen.');
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof TypeError)
      throw new ApiError(0, 'Network error: Could not connect to server');
    throw new ApiError(500, error instanceof Error ? error.message : 'Unknown error');
  }
}

function redirectToLogin() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.replace(
      `/login?return_to=${encodeURIComponent(window.location.pathname + window.location.search)}`
    );
  }
}
