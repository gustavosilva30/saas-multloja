// =============================================================================
// 🔒 C6: Token de acesso vive APENAS em memória (escopo do módulo).
// Refresh token vive em cookie httpOnly que o browser anexa automaticamente
// quando passamos `credentials: 'include'`. localStorage NUNCA é usado para auth.
// =============================================================================

const API_URL = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';

let inMemoryAccessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null): void { inMemoryAccessToken = token; }
export function getAccessToken(): string | null { return inMemoryAccessToken; }

/**
 * Permite ao AuthContext registrar um callback de logout. Quando o refresh
 * falha, chamamos isso ao invés de hard-redirect para preservar o estado React.
 */
export function setSessionExpiredHandler(fn: () => void): void { onSessionExpired = fn; }

// ─── Refresh com lock (evita N requests dispararem N refreshes em paralelo) ──

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const r = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!r.ok) return null;
      const { token } = await r.json();
      inMemoryAccessToken = token;
      return token as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/**
 * Tenta reidratar a sessão lendo o cookie httpOnly. Usado no bootstrap do app.
 * Retorna o user (via /me) ou null se não houver sessão válida.
 */
export async function bootstrapSession<T = AuthUser>(): Promise<T | null> {
  const token = await refreshAccessToken();
  if (!token) return null;
  try {
    const r = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data.user as T;
  } catch { return null; }
}

// ─── Wrapper apiFetch ────────────────────────────────────────────────────────

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: any;            // aceita objeto direto — serializamos como JSON
  raw?: boolean;         // se true, devolve a Response sem fazer .json()
  noAuth?: boolean;      // requisições públicas (não envia Authorization)
}

/**
 * Substitui o fetch nativo em todo o frontend.
 * - Sempre injeta credentials: 'include' (necessário para o cookie de refresh).
 * - Injeta Authorization: Bearer <token-em-memória>.
 * - Em caso de 401, tenta refresh automático e refaz a request original.
 * - Se o refresh falhar, dispara o handler de sessão expirada.
 */
export async function apiFetch<T = any>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const { body, raw, noAuth, headers: extraHeaders, ...rest } = opts;

  // Aceita: undefined, FormData (passa direto), string (assume JSON pré-serializado),
  // qualquer objeto (serializa). Evita duplo-encode se o caller já chamou JSON.stringify.
  const isFormData = body instanceof FormData;
  const isString   = typeof body === 'string';
  const serialized = body === undefined ? undefined
                   : isFormData          ? body
                   : isString            ? body
                   : JSON.stringify(body);
  const needsJsonHeader = body !== undefined && !isFormData;

  const buildInit = (token: string | null): RequestInit => ({
    ...rest,
    credentials: 'include',
    headers: {
      ...(needsJsonHeader ? { 'Content-Type': 'application/json' } : {}),
      ...(!noAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: serialized,
  });

  const url = `${API_URL}${path}`;
  let response = await fetch(url, buildInit(inMemoryAccessToken));

  // ── Interceptor 401: tenta refresh + retry uma única vez ──
  const isAuthEndpoint = path.startsWith('/api/auth/login')
                      || path.startsWith('/api/auth/register')
                      || path.startsWith('/api/auth/refresh');

  if (response.status === 401 && !noAuth && !isAuthEndpoint) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetch(url, buildInit(newToken));
    } else {
      // Sessão morta — limpa estado e dispara handler
      inMemoryAccessToken = null;
      if (onSessionExpired) onSessionExpired();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

  if (raw) return response as unknown as T;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.errors?.[0]?.msg || `Request failed: ${response.status}`);
  }
  return data as T;
}

// ─── Compat: mantém request() apontando para apiFetch ────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { method, body, headers } = options;
  return apiFetch<T>(path, {
    method,
    headers: headers as any,
    body: body ? JSON.parse(body as string) : undefined,
  });
}

// ─── Auth ────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'operator' | 'viewer';
  job_title?: string;
  tenant_id: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: {
    email: string;
    password: string;
    full_name: string;
    tenant_name: string;
    niche?: string;
  }) =>
    request<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<{ user: AuthUser & { tenant_name: string; niche: string } }>('/api/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  logout: () =>
    request('/api/auth/logout', {
      method: 'POST',
    }),
};

// ─── Usuários ─────────────────────────────────────────────────

export const usersApi = {
  list: () => apiFetch<{ users: any[] }>('/api/users'),
  create: (data: any) => apiFetch<{ user: any }>('/api/users', {
    method: 'POST',
    body: data,
  }),
  update: (id: string, data: any) => apiFetch<{ user: any }>(`/api/users/${id}`, {
    method: 'PUT',
    body: data,
  }),
  delete: (id: string) => apiFetch<{ ok: boolean }>(`/api/users/${id}`, {
    method: 'DELETE',
  }),
};

// ─── Produtos ─────────────────────────────────────────────────

export const productsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ products: any[]; pagination: any }>(`/api/products${qs}`);
  },
  get: (id: string) => request<{ product: any }>(`/api/products/${id}`),
  create: (data: any) => request<{ product: any }>('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<{ product: any }>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/api/products/${id}`, { method: 'DELETE' }),
  updateStock: (id: string, quantity: number, reason?: string) =>
    request(`/api/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ quantity, reason }) }),
};

// ─── Clientes ─────────────────────────────────────────────────

export const customersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ customers: any[]; pagination: any }>(`/api/customers${qs}`);
  },
  get: (id: string) => request<{ customer: any }>(`/api/customers/${id}`),
  create: (data: any) => request<{ customer: any }>('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<{ customer: any }>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/api/customers/${id}`, { method: 'DELETE' }),
};

// ─── Vendas ───────────────────────────────────────────────────

export const salesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ sales: any[]; pagination: any }>(`/api/sales${qs}`);
  },
  get: (id: string) => request<{ sale: any; items: any[] }>(`/api/sales/${id}`),
  create: (data: any) => request<{ sale: any }>('/api/sales', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id: string) => request(`/api/sales/${id}/cancel`, { method: 'PATCH' }),
};

// ─── Upload ───────────────────────────────────────────────────

export const uploadApi = {
  upload: (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<{ url: string }>('/api/upload', { method: 'POST', body: form });
  },
};
