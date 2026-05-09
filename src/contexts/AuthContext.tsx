import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, UserProfile, UserRole, ROLE_PERMISSIONS, RolePermissions, getDefaultRouteForRole } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

// ============================================================
// TIPOS DO CONTEXT
// ============================================================

interface AuthContextType {
  // Estado
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // RBAC
  role: UserRole | null;
  permissions: RolePermissions | null;
  roleLevel: number;
  
  // Helpers de permissão
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
  
  // Ações
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, userData: { full_name: string; tenant_name: string }) => Promise<{ error: Error | null; tenantId?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Estados
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ==========================================================
  // INICIALIZAÇÃO E LISTENERS
  // ==========================================================

  useEffect(() => {
    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ==========================================================
  // CARREGAR PERFIL DO USUÁRIO
  // ==========================================================

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
    } catch (err) {
      console.error('Error loading profile:', err);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user.id);
  }, [user]);

  // ==========================================================
  // RBAC HELPERS (memoizados)
  // ==========================================================

  const role = profile?.role ?? null;
  const permissions = role ? ROLE_PERMISSIONS[role] : null;
  const roleLevel = permissions?.level ?? 0;

  const hasPermission = useCallback((permission: keyof RolePermissions): boolean => {
    return !!permissions?.[permission];
  }, [permissions]);

  const isOwner = role === 'owner';
  const isAdmin = role === 'owner' || role === 'admin';
  const isOperator = role === 'owner' || role === 'admin' || role === 'operator';
  const isViewer = role === 'viewer';

  const canManageUsers = hasPermission('canManageUsers');
  const canViewFinancialReports = hasPermission('canViewFinancialReports');
  const canViewProfit = hasPermission('canViewProfit');
  const canCreateSales = hasPermission('canCreateSales');
  const canCancelSales = hasPermission('canCancelSales');
  const canManageStock = hasPermission('canManageStock');
  const canDelete = role === 'owner' || role === 'admin';

  // ==========================================================
  // AUTH ACTIONS
  // ==========================================================

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    userData: { full_name: string; tenant_name: string }
  ): Promise<{ error: Error | null; tenantId?: string }> => {
    try {
      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) {
        return { error: authError || new Error('Failed to create user') };
      }

      // 2. Criar tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([{ name: userData.tenant_name }])
        .select()
        .single();

      if (tenantError || !tenantData) {
        return { error: tenantError || new Error('Failed to create tenant') };
      }

      // 3. Criar perfil do usuário como OWNER
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          id: authData.user.id,
          tenant_id: tenantData.id,
          email: email,
          full_name: userData.full_name,
          role: 'owner',
          is_active: true,
        }]);

      if (profileError) {
        return { error: profileError };
      }

      return { error: null, tenantId: tenantData.id };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  // ==========================================================
  // PROVIDER VALUE
  // ==========================================================

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user && !!profile,
    role,
    permissions,
    roleLevel,
    hasPermission,
    isOwner,
    isAdmin,
    isOperator,
    isViewer,
    canManageUsers,
    canViewFinancialReports,
    canViewProfit,
    canCreateSales,
    canCancelSales,
    canManageStock,
    canDelete,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================================
// HOC PARA PROTEÇÃO DE COMPONENTES
// ============================================================

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: keyof RolePermissions
) {
  return function WithAuthComponent(props: P) {
    const { isLoading, isAuthenticated, hasPermission } = useAuth();

    if (isLoading) {
      return <div>Carregando...</div>;
    }

    if (!isAuthenticated) {
      window.location.href = '/login';
      return null;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      return <div>Acesso negado. Você não tem permissão para visualizar esta página.</div>;
    }

    return <Component {...props} />;
  };
}
