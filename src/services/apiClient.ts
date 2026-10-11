// Same-origin client for the PHP + JSON backend (see server/README.md).
const API_BASE = '/api/index.php';

export const AUTH_EXPIRED_EVENT = 'pn_auth_expired';

export class ApiError extends Error {
  status: number;
  /** Seconds from the Retry-After header (login throttling), when the server sent one. */
  retryAfter: number | null;
  payload: unknown;

  constructor(status: number, message: string, retryAfter: number | null = null, payload: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
    this.payload = payload;
  }
}

export type AuthMode = 'password' | 'bootstrap';

export interface AccountInfo {
  configured: boolean;
  email: string;
  twofaEnabled: boolean;
  twofaAvailable: boolean;
  lastLoginAt: number | null;
  lastLoginIp: string;
  recoveryCodesLeft: number;
}

export interface TwofaSetup {
  secret: string;
  otpauth: string;
}

export type LoginResult = { twofa: true } | { twofa: false };

export const ACCOUNT_CHANGED_EVENT = 'pn_account_changed';

// Public auth routes answer 401 as part of normal use; every other 401 means the session is gone.
const ANONYMOUS_AUTH_ROUTES = new Set(['auth/mode', 'auth/me', 'auth/login', 'auth/otp', 'auth/verify']);

export interface AdminSettings {
  phone: string;
  chatIdMasked: string;
  botUsername: string;
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
    if (response.status === 401 && !ANONYMOUS_AUTH_ROUTES.has(route)) {
      setCsrfToken(null);
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    const message = payload && typeof payload.error === 'string' ? payload.error : 'Yêu cầu thất bại.';
    const retryHeader = Number.parseInt(response.headers.get('Retry-After') ?? '', 10);
    throw new ApiError(response.status, message, Number.isFinite(retryHeader) ? retryHeader : null, payload);
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

  getAuthMode(): Promise<{ mode: AuthMode; twofa: boolean }> {
    return request('auth/mode');
  },

  /** Email + password login. Resolves {twofa:true} when the server wants the authenticator/recovery code. */
  async login(email: string, password: string, code?: string): Promise<LoginResult> {
    try {
      const res = await request<{ csrf: string }>('auth/login', {
        method: 'POST',
        json: code ? { email, password, code } : { email, password },
      });
      setCsrfToken(res.csrf);
      return { twofa: false };
    } catch (err) {
      const payload = err instanceof ApiError ? (err.payload as { twofa?: boolean } | null) : null;
      if (err instanceof ApiError && err.status === 401 && payload?.twofa === true) return { twofa: true };
      throw err;
    }
  },

  getAccount(): Promise<AccountInfo> {
    return request<AccountInfo>('auth/account');
  },

  async setAccount(change: { email?: string; password?: string; currentPassword?: string }): Promise<void> {
    await request('auth/account/set', { method: 'POST', json: change });
    window.dispatchEvent(new CustomEvent(ACCOUNT_CHANGED_EVENT));
  },

  async logoutAll(): Promise<void> {
    await request('auth/logout-all', { method: 'POST' });
    setCsrfToken(null);
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  },

  twofaBegin(password: string): Promise<TwofaSetup> {
    return request('auth/2fa/begin', { method: 'POST', json: { password } });
  },

  async twofaEnable(code: string): Promise<string[]> {
    const res = await request<{ recoveryCodes: string[] }>('auth/2fa/enable', { method: 'POST', json: { code } });
    return res.recoveryCodes;
  },

  twofaDisable(password: string, code: string): Promise<{ ok: true }> {
    return request('auth/2fa/disable', { method: 'POST', json: { password, code } });
  },

  getAdminSettings(): Promise<AdminSettings> {
    return request<AdminSettings>('settings/admin');
  },

  requestTelegramChange(change: { newChatId?: string; newPhone?: string; currentPassword?: string }): Promise<{ ok: true; expiresIn: number }> {
    return request('settings/telegram/request', { method: 'POST', json: change });
  },

  confirmTelegramChange(otp: string): Promise<{ ok: true; phone: string; chatIdMasked: string }> {
    return request('settings/telegram/confirm', { method: 'POST', json: { otp } });
  },

  async logout(): Promise<void> {
    try {
      await request('auth/logout', { method: 'POST' });
    } finally {
      setCsrfToken(null);
    }
  },
};
