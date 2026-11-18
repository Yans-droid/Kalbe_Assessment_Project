export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      // Best-effort call logout to ensure backend clears httpOnly cookies
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
      // Redirect with expired flag to prevent Next.js middleware loop
      window.location.href = '/login?expired=true';
    }
    throw new ApiError('Unauthorized', 401);
  }

  if (!res.ok) {
    let message = 'An error occurred';
    try {
      const errorData = await res.json();
      message = errorData.detail || errorData.title || errorData.message || message;
    } catch {
      // ignore parse error
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}
