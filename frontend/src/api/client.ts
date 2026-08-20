// =============================================================================
// Moonview Frontend — TanStack Query Client
// =============================================================================

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 minutes
      gcTime: 1000 * 60 * 30,          // 30 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (auth failures, not found, etc.)
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// ---------------------------------------------------------------------------
// Typed fetch helper — wraps fetch with error handling
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_BASE_URL ?? '/api');

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { timeout?: number },
): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options || {};

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    // Extract CSRF token from document.cookie
    const match = document.cookie.match(/(?:^|;)\s*csrfToken\s*=\s*([^;]+)/);
    const csrfToken = match ? match[1] : undefined;
    const isMutation = fetchOptions.method && fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD';
    const headers = new Headers(fetchOptions?.headers);
    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (isMutation && csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
      signal: fetchOptions.signal || controller.signal,
    });

    clearTimeout(id);

    // Some endpoints may return 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new ApiError(response.status, 'INVALID_RESPONSE', 'Server returned non-JSON response');
    }

    const json = await response.json();

    if (!response.ok || json.success === false) {
      throw new ApiError(
        response.status,
        json.error?.code ?? 'UNKNOWN_ERROR',
        json.error?.message ?? 'An unexpected error occurred',
      );
    }

    // Older Moonview controllers return their typed payload directly. Keep
    // compatibility while newer endpoints use the standard success envelope.
    if (json.success === true) {
      return (json as { success: true; data: T }).data;
    }
    return json as T;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'REQUEST_TIMEOUT', 'Request timed out');
    }
    throw new ApiError(500, 'NETWORK_ERROR', 'Network error or server is unreachable');
  }
}
