# Guia RBAC - Role-Based Access Control

Sistema de controle de acesso baseado em papéis (RBAC) para o NexusERP.

---

## 🎯 Hierarquia de Papéis

| Papel | Nível | Descrição | Caso de Uso |
|-------|-------|-----------|-------------|
| **Owner** (Dono) | 4 | Acesso total, faturamento, ativação de módulos e deleção de conta | Dono da empresa |
| **Admin** (Administrador) | 3 | Gerencia usuários, vê relatórios financeiros e altera estoque | Gerente/Administrador |
| **Operator** (Operador) | 2 | Realiza vendas, cadastros e consultas de estoque. Não vê lucro. | Vendedor/Operador de caixa |
| **Viewer** (Visualizador) | 1 | Apenas consulta dados (ex: contador ou auditor) | Contador/Auditor |

---

## 📋 Matriz de Permissões

| Permissão | Owner | Admin | Operator | Viewer |
|-----------|:-----:|:-----:|:--------:|:------:|
| **Gestão de Usuários** |
| `canManageUsers` | ✅ | ✅ | ❌ | ❌ |
| **Faturamento** |
| `canManageBilling` | ✅ | ❌ | ❌ | ❌ |
| **Módulos** |
| `canManageModules` | ✅ | ❌ | ❌ | ❌ |
| **Conta** |
| `canDeleteAccount` | ✅ | ❌ | ❌ | ❌ |
| **Financeiro** |
| `canViewFinancialReports` | ✅ | ✅ | ❌ | ✅ |
| `canViewProfit` | ✅ | ✅ | ❌ | ✅ |
| `canDeleteFinancial` | ✅ | ✅ | ❌ | ❌ |
| **Estoque** |
| `canManageStock` | ✅ | ✅ | ✅ | ❌ |
| `canDeleteProducts` | ✅ | ✅ | ❌ | ❌ |
| **Vendas** |
| `canCreateSales` | ✅ | ✅ | ✅ | ❌ |
| `canCancelSales` | ✅ | ✅ | ❌ | ❌ |
| `canDeleteSales` | ✅ | ❌ | ❌ | ❌ |
| **Clientes** |
| `canManageCustomers` | ✅ | ✅ | ✅ | ❌ |
| **Dados** |
| `canViewAllData` | ✅ | ✅ | ❌ | ✅ |
| `canExportData` | ✅ | ✅ | ❌ | ✅ |

---

## 🚀 Uso no Frontend

### 1. Proteção de Rotas

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';

// No router
<Route path="/users" element={
  <ProtectedRoute requiredPermission="canManageUsers">
    <UsersPage />
  </ProtectedRoute>
} />

// Ou com role específica
<Route path="/finance" element={
  <ProtectedRoute requiredPermission="canViewFinancialReports">
    <FinancePage />
  </ProtectedRoute>
} />

// Ou com nível mínimo
<Route path="/admin" element={
  <ProtectedRoute minimumRoleLevel={3}>
    <AdminPage />
  </ProtectedRoute>
} />
```

### 2. Esconder/Show Elementos UI

```tsx
import { 
  PermissionGuard, 
  AdminOnly, 
  OwnerOnly,
  CanViewProfit,
  CanManageUsers 
} from '@/components/ProtectedRoute';

// Baseado em permissão específica
<PermissionGuard permission="canViewProfit">
  <ProfitDisplay value={product.profit} />
</PermissionGuard>

// Ou usar os helpers
<CanViewProfit>
  <span>Lucro: R$ {profit}</span>
</CanViewProfit>

<AdminOnly>
  <DeleteButton onClick={handleDelete} />
</AdminOnly>

<OwnerOnly>
  <DeleteAccountButton />
</OwnerOnly>

<CanManageUsers>
  <UserManagementPanel />
</CanManageUsers>
```

### 3. Hook useAuth

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { 
    user,           // Usuário autenticado
    profile,        // Perfil completo
    role,           // 'owner' | 'admin' | 'operator' | 'viewer'
    roleLevel,      // 4 | 3 | 2 | 1
    isOwner,        // boolean
    isAdmin,        // boolean (owner || admin)
    isOperator,     // boolean (owner || admin || operator)
    canViewProfit,  // boolean
    canManageUsers, // boolean
    hasPermission,  // (permission) => boolean
    // ... mais helpers
  } = useAuth();

  // Uso condicional
  if (canViewProfit) {
    return <ProfitReport />;
  }
  
  return <SalesReport />;
}
```

### 4. Botões Condicionais

```tsx
function ProductCard({ product }) {
  const { isAdmin, canViewProfit, canManageStock } = useAuth();

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>Preço: R$ {product.sale_price}</p>
      
      {/* Só mostra preço de custo/lucro se tiver permissão */}
      {canViewProfit && (
        <>
          <p>Custo: R$ {product.cost_price}</p>
          <p>Lucro: R$ {product.sale_price - product.cost_price}</p>
        </>
      )}
      
      {/* Botões de ação */}
      {canManageStock && (
        <button onClick={editProduct}>Editar</button>
      )}
      
      {isAdmin && (
        <button onClick={deleteProduct} className="danger">
          Deletar
        </button>
      )}
    </div>
  );
}
```

---

## 🔄 Fluxo de Redirecionamento

```
Usuário tenta acessar /finance
         │
         ▼
    Autenticado?
    ├─ Não → /login
    └─ Sim → Tem permissão canViewFinancialReports?
             ├─ Sim → Mostra página
             └─ Não → Redireciona para rota padrão da role
                      ├─ owner/admin → /dashboard
                      ├─ operator → /pos
                      └─ viewer → /reports
```

---

## 🧪 Testando Permissões

### Teste de Integração
```typescript
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';

describe('RBAC', () => {
  it('operator should not see profit', () => {
    // Mock profile com role 'operator'
    const { result } = renderHook(() => useAuth(), {
      wrapper: createMockAuthWrapper({ role: 'operator' })
    });
    
    expect(result.current.canViewProfit).toBe(false);
    expect(result.current.canCreateSales).toBe(true);
  });
});
```

---

## 📝 Atualizando o Banco de Dados

Para alterar a role de um usuário:

```sql
-- Promover para admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = 'uuid-do-usuario';

-- Rebaixar para viewer
UPDATE user_profiles 
SET role = 'viewer' 
WHERE id = 'uuid-do-usuario';
```

---

## 🛡️ Segurança no Backend (RLS)

As políticas RLS no PostgreSQL já estão configuradas para respeitar as roles:

```sql
-- Exemplo: Apenas owner pode deletar vendas
CREATE POLICY "sales_isolation_delete" ON public.sales
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'owner'
  );
```

---

## 📚 Arquivos Relacionados

- `@/src/contexts/AuthContext.tsx` - Contexto de autenticação e RBAC
- `@/src/components/ProtectedRoute.tsx` - Proteção de rotas e componentes
- `@/src/lib/supabase.ts` - Helpers RBAC e ROLE_PERMISSIONS
- `@/src/data/supabase_schema.sql` - Políticas RLS no banco
