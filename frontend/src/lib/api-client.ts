/**
 * Centralized API client for SmartAttend.
 *
 * Token storage strategy: sessionStorage
 * - Scoped to the browser tab; cleared on tab close.
 * - Superior to localStorage for JWTs (doesn't persist across sessions).
 * - Tradeoff: user must re-login if they close the tab.
 * - The backend remains the authorization authority; this is a UX convenience only.
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const TOKEN_KEY = 'smartattend_token';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiClientError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    // Redirect to login — avoid infinite loops by checking current path
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new ApiClientError(401, 'Authentication required');
  }

  if (!response.ok) {
    let detail = 'An unexpected error occurred';
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // Response body wasn't JSON
    }
    throw new ApiClientError(response.status, detail);
  }

  // Some endpoints return empty body (204, etc.)
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  const isFormData = body instanceof FormData;
  return request<T>(path, {
    method: 'POST',
    body: body !== undefined ? (isFormData ? body as BodyInit : JSON.stringify(body)) : undefined,
  });
}

export function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}
