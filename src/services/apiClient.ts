// Same-origin client for the PHP + JSON backend (see server/README.md).
const API_BASE = '/api/index.php';

export const AUTH_EXPIRED_EVENT = 'pn_auth_expired';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  query?: Record<string, string>;
  json?: unknown;
  form?: FormData;
  timeoutMs?: number;
}

async function request<T>(route: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, json, form, timeoutMs = 15000 } = options;
  const params = new URLSearchParams({ r: route, ...query });
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;
  if (json !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}?${params.toString()}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'Không thể kết nối tới máy chủ.');
  } finally {
    clearTimeout(timer);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !route.startsWith('auth/')) {
      setCsrfToken(null);
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    const message = payload && typeof payload.error === 'string' ? payload.error : 'Yêu cầu thất bại.';
    throw new ApiError(response.status, message);
  }
  return payload as T;
}

export const api = {
  getData<T>(collection: string): Promise<T> {
    return request<T>('data', { query: { c: collection }, timeoutMs: 6000 });
  },

  putData(collection: string, body: unknown): Promise<{ ok: true }> {
    return request('data', { method: 'PUT', query: { c: collection }, json: body });
  },

  postLead(body: Record<string, unknown>): Promise<{ ok: true }> {
    return request('lead', { method: 'POST', json: body });
  },

  upload(file: File, category: string): Promise<{ ok: true; item: unknown }> {
    const form = new FormData();
    form.append('file', file);
    form.append('category', category);
    return request('upload', { method: 'POST', form, timeoutMs: 60000 });
  },

  requestOtp(phone: string): Promise<{ ok: true; expiresIn: number }> {
    return request('auth/otp', { method: 'POST', json: { phone } });
  },

  async verifyOtp(otp: string): Promise<void> {
    const res = await request<{ csrf: string }>('auth/verify', { method: 'POST', json: { otp } });
    setCsrfToken(res.csrf);
  },

  async me(): Promise<boolean> {
    const res = await request<{ authenticated: boolean; csrf?: string }>('auth/me');
    setCsrfToken(res.authenticated ? (res.csrf ?? null) : null);
    return res.authenticated;
  },

  async logout(): Promise<void> {
    try {
      await request('auth/logout', { method: 'POST' });
    } finally {
      setCsrfToken(null);
    }
  },
};
