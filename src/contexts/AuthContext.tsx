import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, AuthUser } from '@/lib/api';

// ─── Tipos ────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'operator' | 'viewer';

export interface RolePermissions {
  level: number;
  canManageUsers: boolean;
  canViewFinancialReports: boolean;
  canViewProfit: boolean;
  canCreateSales: boolean;
  canCancelSales: boolean;
  canManageStock: boolean;
  canManageCustomers: boolean;
  canManageModules: boolean;
  canDelete: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  owner: {
    level: 4,
    canManageUsers: true,
    canViewFinancialReports: true,
    canViewProfit: true,
    canCreateSales: true,
    canCancelSales: true,
    canManageStock: true,
    canManageCustomers: true,
    canManageModules: true,
    canDelete: true,
  },
  admin: {
    level: 3,
    canManageUsers: true,
    canViewFinancialReports: true,
    canViewProfit: true,
    canCreateSales: true,
    canCancelSales: true,
    canManageStock: true,
    canManageCustomers: true,
    canManageModules: false,
    canDelete: true,
  },
  operator: {
    level: 2,
    canManageUsers: false,
    canViewFinancialReports: false,
    canViewProfit: false,
    canCreateSales: true,
    canCancelSales: false,
    canManageStock: true,
    canManageCustomers: true,
    canManageModules: false,
    canDelete: false,
  },
  viewer: {
    level: 1,
    canManageUsers: false,
    canViewFinancialReports: true,
    canViewProfit: false,
    canCreateSales: false,
    canCancelSales: false,
    canManageStock: false,
    canManageCustomers: false,
    canManageModules: false,
    canDelete: false,
  },
};

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  permissions: RolePermissions | null;
  roleLevel: number;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  isViewer: boolean;
  canManageUsers: boolean;
  canViewFinancialReports: boolean;
  canViewProfit: boolean;
  canCreateSales: boolean;
  canCancelSales: boolean;
  canManageStock: boolean;
  canDelete: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, userData: { full_name: string; tenant_name: string; niche?: string }) => Promise<{ error: Error | null }>;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar usuário do token salvo
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi.me()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('auth_token'))
      .finally(() => setIsLoading(false));
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch {
      // token inválido
    }
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { token, user } = await authApi.login(email, password);
      localStorage.setItem('auth_token', token);
      setUser(user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: { full_name: string; tenant_name: string; niche?: string }
  ): Promise<{ error: Error | null }> => {
    try {
      const { token, user } = await authApi.register({ email, password, ...userData });
      localStorage.setItem('auth_token', token);
      setUser(user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  // RBAC
  const role = (user?.role ?? null) as UserRole | null;
  const permissions = role ? ROLE_PERMISSIONS[role] : null;
  const roleLevel = permissions?.level ?? 0;
  const hasPermission = useCallback((p: keyof RolePermissions) => !!permissions?.[p], [permissions]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    role,
    permissions,
    roleLevel,
    hasPermission,
    isOwner: role === 'owner',
    isAdmin: role === 'owner' || role === 'admin',
    isOperator: role === 'owner' || role === 'admin' || role === 'operator',
    isViewer: role === 'viewer',
    canManageUsers: hasPermission('canManageUsers'),
    canViewFinancialReports: hasPermission('canViewFinancialReports'),
    canViewProfit: hasPermission('canViewProfit'),
    canCreateSales: hasPermission('canCreateSales'),
    canCancelSales: hasPermission('canCancelSales'),
    canManageStock: hasPermission('canManageStock'),
    canDelete: hasPermission('canDelete'),
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
