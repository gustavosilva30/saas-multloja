const API_URL = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

let isRefreshing = false;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include', // Send cookies (Refresh Token)
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Se o token expirou (401) e não estamos na rota de login ou na própria rota de refresh
  if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh') && !isRefreshing) {
    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const { token: newToken } = await refreshRes.json();
        localStorage.setItem('auth_token', newToken);
        isRefreshing = false;
        // Retry original request
        return request<T>(path, options);
      }
    } catch (err) {
      // Refresh failed
    } finally {
      isRefreshing = false;
    }

    // Se falhou o refresh, limpa e redireciona (ou deixa o context tratar)
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data as T;
}

// ─── Auth ────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'operator' | 'viewer';
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
  upload: async (file: File): Promise<{ url: string }> => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Upload failed');
    return data;
  },
};
