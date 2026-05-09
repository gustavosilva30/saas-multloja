import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente Supabase singleton
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// ============================================================
// TIPOS DE DADOS (baseados no schema RLS)
// ============================================================

export type Tenant = {
  id: string;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: Record<string, any>;
  settings?: Record<string, any>;
  niche?: 'varejo' | 'oficina' | 'clinica' | 'restaurante' | 'outros';
  is_active: boolean;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
};

// ============================================================
// RBAC - ROLE-BASED ACCESS CONTROL
// ============================================================

export type UserRole = 'owner' | 'admin' | 'operator' | 'viewer';

export type UserProfile = {
  id: string;
  tenant_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
};

// ============================================================
// MATRIZ DE PERMISSÕES RBAC
// ============================================================

export const ROLE_PERMISSIONS = {
  owner: {
    level: 4,
    label: 'Dono',
    description: 'Acesso total, faturamento, ativação de módulos e deleção de conta',
    canManageUsers: true,
    canManageBilling: true,
    canManageModules: true,
    canDeleteAccount: true,
    canViewFinancialReports: true,
    canViewProfit: true,
    canManageStock: true,
    canCreateSales: true,
    canCancelSales: true,
    canManageCustomers: true,
    canDeleteSales: true,
    canDeleteProducts: true,
    canDeleteFinancial: true,
    canViewAllData: true,
    canExportData: true,
  },
  admin: {
    level: 3,
    label: 'Administrador',
    description: 'Gerencia usuários, vê relatórios financeiros e altera estoque',
    canManageUsers: true,
    canManageBilling: false,
    canManageModules: false,
    canDeleteAccount: false,
    canViewFinancialReports: true,
    canViewProfit: true,
    canManageStock: true,
    canCreateSales: true,
    canCancelSales: true,
    canManageCustomers: true,
    canDeleteSales: false,
    canDeleteProducts: true,
    canDeleteFinancial: true,
    canViewAllData: true,
    canExportData: true,
  },
  operator: {
    level: 2,
    label: 'Operador',
    description: 'Realiza vendas, cadastros e consultas de estoque',
    canManageUsers: false,
    canManageBilling: false,
    canManageModules: false,
    canDeleteAccount: false,
    canViewFinancialReports: false,
    canViewProfit: false,
    canManageStock: true,
    canCreateSales: true,
    canCancelSales: false,
    canManageCustomers: true,
    canDeleteSales: false,
    canDeleteProducts: false,
    canDeleteFinancial: false,
    canViewAllData: false,
    canExportData: false,
  },
  viewer: {
    level: 1,
    label: 'Visualizador',
    description: 'Apenas consulta dados (ex: contador ou auditor)',
    canManageUsers: false,
    canManageBilling: false,
    canManageModules: false,
    canDeleteAccount: false,
    canViewFinancialReports: true,
    canViewProfit: true,
    canManageStock: false,
    canCreateSales: false,
    canCancelSales: false,
    canManageCustomers: false,
    canDeleteSales: false,
    canDeleteProducts: false,
    canDeleteFinancial: false,
    canViewAllData: true,
    canExportData: true,
  },
} as const;

export type RolePermissions = typeof ROLE_PERMISSIONS[UserRole];

export type Product = {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  unit: string;
  barcode?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  tenant_id: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  address?: Record<string, any>;
  birthday?: string;
  notes?: string;
  credit_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Sale = {
  id: string;
  tenant_id: string;
  customer_id?: string;
  user_id?: string;
  sale_number?: string;
  sale_date: string;
  subtotal: number;
  discount: number;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'cancelled';
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type SaleItem = {
  id: string;
  tenant_id: string;
  sale_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  created_at: string;
};

export type FinancialTransaction = {
  id: string;
  tenant_id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  payment_method?: string;
  customer_id?: string;
  sale_id?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  created_at: string;
  updated_at: string;
};

// ============================================================
// HELPERS DE AUTENTICAÇÃO E TENANT
// ============================================================

/**
 * Retorna o tenant_id do usuário autenticado (do JWT)
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id;
  return tenantId ? String(tenantId) : null;
}

// ============================================================
// FUNÇÕES DE CRUD COM RLS AUTOMÁTICO
// ============================================================

// ----- PRODUCTS -----
export const productsApi = {
  async list() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');
    return { data: data as Product[] | null, error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    return { data: data as Product | null, error };
  },

  async create(product: Omit<Product, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    return { data: data as Product | null, error };
  },

  async update(id: string, updates: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data: data as Product | null, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    return { error };
  },

  async search(query: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(20);
    return { data: data as Product[] | null, error };
  }
};

// ----- CUSTOMERS -----
export const customersApi = {
  async list() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    return { data: data as Customer[] | null, error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    return { data: data as Customer | null, error };
  },

  async create(customer: Omit<Customer, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();
    return { data: data as Customer | null, error };
  },

  async update(id: string, updates: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data: data as Customer | null, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    return { error };
  },

  async search(query: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`name.ilike.%${query}%,document.ilike.%${query}%,phone.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(20);
    return { data: data as Customer[] | null, error };
  }
};

// ----- SALES -----
export const salesApi = {
  async list(limit = 50) {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        customer:customers(name),
        items:sale_items(*)
      `)
      .order('sale_date', { ascending: false })
      .limit(limit);
    return { data: data as (Sale & { customer: { name: string }, items: SaleItem[] })[] | null, error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        customer:customers(*),
        items:sale_items(*)
      `)
      .eq('id', id)
      .single();
    return { data: data as (Sale & { customer: Customer, items: SaleItem[] }) | null, error };
  },

  async create(sale: Omit<Sale, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>, items: Omit<SaleItem, 'id' | 'tenant_id' | 'sale_id' | 'created_at'>[]) {
    // Cria a venda
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([sale])
      .select()
      .single();

    if (saleError || !saleData) return { data: null, error: saleError };

    // Cria os itens da venda
    const saleItems = items.map(item => ({
      ...item,
      sale_id: saleData.id
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    return { data: saleData as Sale, error: itemsError };
  },

  async updateStatus(id: string, status: Sale['status']) {
    const { data, error } = await supabase
      .from('sales')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data: data as Sale | null, error };
  },

  async cancel(id: string) {
    return this.updateStatus(id, 'cancelled');
  }
};

// ----- FINANCIAL -----
export const financialApi = {
  async list(filters?: { status?: string; type?: string; startDate?: string; endDate?: string }) {
    let query = supabase
      .from('financial_transactions')
      .select('*')
      .order('due_date', { ascending: true });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.startDate) query = query.gte('due_date', filters.startDate);
    if (filters?.endDate) query = query.lte('due_date', filters.endDate);

    const { data, error } = await query;
    return { data: data as FinancialTransaction[] | null, error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('id', id)
      .single();
    return { data: data as FinancialTransaction | null, error };
  },

  async create(transaction: Omit<FinancialTransaction, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert([transaction])
      .select()
      .single();
    return { data: data as FinancialTransaction | null, error };
  },

  async update(id: string, updates: Partial<FinancialTransaction>) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data: data as FinancialTransaction | null, error };
  },

  async pay(id: string, paymentDate = new Date().toISOString()) {
    return this.update(id, { status: 'PAID', payment_date: paymentDate });
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('id', id);
    return { error };
  },

  async getSummary(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .rpc('get_financial_summary', { 
        start_date: startDate, 
        end_date: endDate 
      });
    return { data, error };
  }
};

// ----- TENANT -----
export const tenantApi = {
  async getCurrent() {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .single();
    return { data: data as Tenant | null, error };
  },

  async update(updates: Partial<Tenant>) {
    const { data, error } = await supabase
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .select()
      .single();
    return { data: data as Tenant | null, error };
  }
};

// ----- USER PROFILE -----
export const userProfileApi = {
  async getCurrent() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    return { data: data as UserProfile | null, error };
  },

  async listByTenant() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_active', true)
      .order('full_name');
    return { data: data as UserProfile[] | null, error };
  },

  async update(id: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data: data as UserProfile | null, error };
  },

  async create(user: Omit<UserProfile, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'last_login_at'>) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { data: null, error: new Error('Not authenticated') };

    const currentProfile = await this.getCurrent();
    if (!currentProfile.data?.tenant_id) {
      return { data: null, error: new Error('No tenant context') };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert([{ ...user, tenant_id: currentProfile.data.tenant_id }])
      .select()
      .single();
    return { data: data as UserProfile | null, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// ============================================================
// RBAC HELPERS
// ============================================================

/**
 * Retorna a role do usuário autenticado (do JWT)
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.user_role;
  return role && ['owner', 'admin', 'operator', 'viewer'].includes(role) 
    ? role as UserRole 
    : null;
}

/**
 * Verifica se o usuário tem uma permissão específica
 */
export async function hasPermission(
  permission: keyof RolePermissions
): Promise<boolean> {
  const role = await getCurrentUserRole();
  if (!role) return false;
  return !!ROLE_PERMISSIONS[role][permission];
}

/**
 * Verifica se o usuário é owner
 */
export async function isOwner(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'owner';
}

/**
 * Verifica se o usuário é admin ou superior
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'owner' || role === 'admin';
}

/**
 * Verifica se o usuário é operator ou superior
 */
export async function isOperator(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'owner' || role === 'admin' || role === 'operator';
}

/**
 * Verifica se o usuário pode gerenciar outros usuários
 */
export async function canManageUsers(): Promise<boolean> {
  return hasPermission('canManageUsers');
}

/**
 * Verifica se o usuário pode ver relatórios financeiros (incluindo lucro)
 */
export async function canViewFinancialReports(): Promise<boolean> {
  return hasPermission('canViewFinancialReports');
}

/**
 * Verifica se o usuário pode ver lucro/preço de custo
 */
export async function canViewProfit(): Promise<boolean> {
  return hasPermission('canViewProfit');
}

/**
 * Verifica se o usuário pode criar vendas
 */
export async function canCreateSales(): Promise<boolean> {
  return hasPermission('canCreateSales');
}

/**
 * Verifica se o usuário pode cancelar vendas
 */
export async function canCancelSales(): Promise<boolean> {
  return hasPermission('canCancelSales');
}

/**
 * Verifica se o usuário pode deletar registros
 */
export async function canDelete(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'owner' || role === 'admin';
}

/**
 * Verifica se o usuário pode gerenciar estoque
 */
export async function canManageStock(): Promise<boolean> {
  return hasPermission('canManageStock');
}

/**
 * Obtém informações da role atual
 */
export async function getRoleInfo(): Promise<{ role: UserRole | null; permissions: RolePermissions | null }> {
  const role = await getCurrentUserRole();
  if (!role) return { role: null, permissions: null };
  return { role, permissions: ROLE_PERMISSIONS[role] };
}

// ============================================================
// ROTAS PROTEGIDAS - MAPA DE PERMISSÕES POR ROTA
// ============================================================

export const ROUTE_PERMISSIONS: Record<string, keyof RolePermissions> = {
  '/users': 'canManageUsers',
  '/billing': 'canManageBilling',
  '/modules': 'canManageModules',
  '/finance': 'canViewFinancialReports',
  '/finance/reports': 'canViewFinancialReports',
  '/reports': 'canViewFinancialReports',
  '/stock': 'canManageStock',
  '/pos': 'canCreateSales',
  '/sales': 'canCreateSales',
  '/customers': 'canManageCustomers',
  '/settings/account': 'canDeleteAccount',
  '/export': 'canExportData',
};

/**
 * Verifica se o usuário pode acessar uma rota específica
 */
export async function canAccessRoute(route: string): Promise<boolean> {
  // Rotas públicas sempre permitidas
  if (route === '/login' || route === '/register' || route === '/') {
    return true;
  }

  // Verificar permissão específica da rota
  for (const [path, permission] of Object.entries(ROUTE_PERMISSIONS)) {
    if (route.startsWith(path)) {
      return hasPermission(permission);
    }
  }

  // Rotas não mapeadas: apenas usuários autenticados
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

/**
 * Redirecionamento baseado na role (para usar em middleware/guards)
 */
export function getDefaultRouteForRole(role: UserRole | null): string {
  switch (role) {
    case 'owner':
    case 'admin':
      return '/dashboard';
    case 'operator':
      return '/pos';
    case 'viewer':
      return '/reports';
    default:
      return '/login';
  }
}

// ============================================================
// AUDIT LOGS API
// ============================================================

export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

export const auditApi = {
  // Buscar histórico de auditoria de uma entidade
  async getEntityHistory(entityType: string, entityId: string) {
    const { data, error } = await supabase
      .rpc('get_entity_audit_history', {
        p_tenant_id: await getCurrentTenantId() || '',
        p_entity_type: entityType,
        p_entity_id: entityId,
      });
    return { data: data as AuditLog[] | null, error };
  },

  // Buscar histórico de um usuário
  async getUserHistory(userId: string, startDate?: string, endDate?: string) {
    const { data, error } = await supabase
      .rpc('get_user_audit_history', {
        p_tenant_id: await getCurrentTenantId() || '',
        p_user_id: userId,
        p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate || new Date().toISOString(),
      });
    return { data: data as AuditLog[] | null, error };
  },

  // Buscar alterações suspeitas
  async getSuspiciousChanges(startDate?: string) {
    const { data, error } = await supabase
      .rpc('get_suspicious_changes', {
        p_tenant_id: await getCurrentTenantId() || '',
        p_start_date: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    return { data: data as AuditLog[] | null, error };
  },

  // Listar logs com filtros
  async list(filters?: {
    action?: string;
    entityType?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.action) query = query.eq('action', filters.action);
    if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    return { data: data as AuditLog[] | null, error };
  },
};

// ============================================================
// MANUAL AUDIT LOGGING (para ações no frontend)
// ============================================================

export async function logManualAudit(params: {
  action: string;
  entityType: string;
  entityId: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
}): Promise<void> {
  const tenantId = await getCurrentTenantId();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!tenantId || !user) {
    console.error('Cannot log audit: missing tenant or user');
    return;
  }

  // Detectar campos alterados
  let changedFields: string[] | undefined;
  if (params.oldData && params.newData) {
    changedFields = Object.keys(params.newData).filter(
      key => params.oldData![key] !== params.newData![key]
    );
  }

  const { error } = await supabase.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: user.id,
    user_email: user.email,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    old_data: params.oldData || null,
    new_data: params.newData || null,
    changed_fields: changedFields || null,
    metadata: params.metadata || {},
  });

  if (error) {
    console.error('Failed to log audit:', error);
  }
}
