const BASE_URL = '/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers:
      options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json', ...options.headers }
        : options.headers,
    ...options,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => undefined);

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? 'Error de red');
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
