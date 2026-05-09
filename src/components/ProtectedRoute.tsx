import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, RolePermissions, UserRole } from '@/contexts/AuthContext';

function getDefaultRouteForRole(role: UserRole | null): string {
  return '/';
}

const ROUTE_PERMISSIONS: Record<string, keyof RolePermissions> = {
  '/finance': 'canViewFinancialReports',
  '/stock': 'canManageStock',
  '/catalog': 'canManageStock',
  '/customers': 'canManageCustomers',
  '/pos': 'canCreateSales',
  '/modules': 'canManageModules',
};

// ============================================================
// TIPOS
// ============================================================

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: keyof RolePermissions;
  requiredRole?: 'owner' | 'admin' | 'operator' | 'viewer';
  minimumRoleLevel?: number;
  fallback?: ReactNode;
}

// ============================================================
// COMPONENTE DE ROTA PROTEGIDA
// ============================================================

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
  minimumRoleLevel,
  fallback,
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, role, roleLevel, hasPermission } = useAuth();
  const location = useLocation();

  // 1. Carregando
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // 2. Não autenticado → Login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 3. Verificar nível mínimo de role
  if (minimumRoleLevel && roleLevel < minimumRoleLevel) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <AccessDenied 
        message="Você não tem nível de acesso suficiente para esta área." 
        redirectTo={getDefaultRouteForRole(role)}
      />
    );
  }

  // 4. Verificar role específica
  if (requiredRole && role !== requiredRole && role !== 'owner') {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <AccessDenied 
        message={`Esta área requer permissão de ${requiredRole}.`}
        redirectTo={getDefaultRouteForRole(role)}
      />
    );
  }

  // 5. Verificar permissão específica
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <AccessDenied 
        message="Você não tem permissão para acessar este recurso."
        redirectTo={getDefaultRouteForRole(role)}
      />
    );
  }

  // 6. Acesso permitido
  return <>{children}</>;
}

// ============================================================
// COMPONENTE DE ACESSO NEGADO
// ============================================================

interface AccessDeniedProps {
  message: string;
  redirectTo: string;
}

function AccessDenied({ message, redirectTo }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <a
          href={redirectTo}
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Voltar para área permitida
        </a>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PARA ESCONDER/SHOW ELEMENTOS BASEADO EM PERMISSÃO
// ============================================================

interface PermissionGuardProps {
  children: ReactNode;
  permission: keyof RolePermissions;
  fallback?: ReactNode;
}

export function PermissionGuard({ children, permission, fallback = null }: PermissionGuardProps) {
  const { hasPermission } = useAuth();
  
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// ============================================================
// COMPONENTE PARA ESCONDER/SHOW BASEADO EM ROLE
// ============================================================

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: Array<'owner' | 'admin' | 'operator' | 'viewer'>;
  fallback?: ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { role } = useAuth();
  
  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// ============================================================
// HOOK PARA VERIFICAR ACESSO À ROTA
// ============================================================

export function useRouteGuard() {
  const { hasPermission, role, isAuthenticated } = useAuth();
  const location = useLocation();

  const canAccessCurrentRoute = (): boolean => {
    if (!isAuthenticated) return false;

    const currentPath = location.pathname;

    // Verificar permissões da rota
    for (const [path, permission] of Object.entries(ROUTE_PERMISSIONS)) {
      if (currentPath.startsWith(path)) {
        return hasPermission(permission);
      }
    }

    // Rotas não mapeadas são permitidas para usuários autenticados
    return true;
  };

  const getRedirectPath = (): string => {
    return getDefaultRouteForRole(role);
  };

  return {
    canAccessCurrentRoute,
    getRedirectPath,
    currentPath: location.pathname,
  };
}

// ============================================================
// UTILITÁRIOS PARA RENDERIZAÇÃO CONDICIONAL
// ============================================================

export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <>{fallback}</>;
}

export function OwnerOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { isOwner } = useAuth();
  return isOwner ? <>{children}</> : <>{fallback}</>;
}

export function OperatorPlus({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { isOperator } = useAuth();
  return isOperator ? <>{children}</> : <>{fallback}</>;
}

export function CanViewProfit({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { canViewProfit } = useAuth();
  return canViewProfit ? <>{children}</> : <>{fallback}</>;
}

export function CanManageUsers({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { canManageUsers } = useAuth();
  return canManageUsers ? <>{children}</> : <>{fallback}</>;
}
