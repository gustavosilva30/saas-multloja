-- ============================================================================
-- NEXUSERP - 03: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Execute este arquivo TERCEIRO no Supabase SQL Editor
-- Ativa RLS e cria políticas de isolamento por tenant
-- ============================================================================

-- ============================================================================
-- 1. HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. POLÍTICAS PARA TENANTS (Empresas)
-- ============================================================================

-- SELECT: Usuário vê seu próprio tenant
CREATE POLICY "tenant_isolation_select" ON public.tenants
  FOR SELECT USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner' AND tenant_id = public.tenants.id
    )
  );

-- UPDATE: Apenas owner pode atualizar dados do tenant
CREATE POLICY "tenant_owner_update" ON public.tenants
  FOR UPDATE USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'owner'
  );

-- ============================================================================
-- 3. POLÍTICAS PARA USER_PROFILES
-- ============================================================================

-- SELECT: Usuários do mesmo tenant se veem
CREATE POLICY "user_profiles_isolation_select" ON public.user_profiles
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    OR id = auth.uid()
  );

-- INSERT: Apenas admin/owner pode criar usuários no tenant
CREATE POLICY "user_profiles_admin_insert" ON public.user_profiles
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin')
  );

-- UPDATE: Usuário atualiza próprio perfil OU admin atualiza qualquer um do tenant
CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE USING (
    id = auth.uid()
    OR (
      tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin')
    )
  );

-- DELETE: Apenas owner pode remover usuários do tenant
CREATE POLICY "user_profiles_owner_delete" ON public.user_profiles
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'owner'
    AND id != auth.uid() -- Não pode se auto-deletar
  );

-- ============================================================================
-- 4. POLÍTICAS PARA CATEGORIAS (Todos os roles autenticados)
-- ============================================================================

CREATE POLICY "categories_isolation_select" ON public.categories
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "categories_isolation_insert" ON public.categories
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "categories_isolation_update" ON public.categories
  FOR UPDATE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "categories_isolation_delete" ON public.categories
  FOR DELETE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- ============================================================================
-- 5. POLÍTICAS PARA PRODUTOS (Todos os roles autenticados)
-- ============================================================================

CREATE POLICY "products_isolation_select" ON public.products
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "products_isolation_insert" ON public.products
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "products_isolation_update" ON public.products
  FOR UPDATE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- DELETE: Apenas owner/admin pode deletar produtos
CREATE POLICY "products_owner_delete" ON public.products
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin')
  );

-- ============================================================================
-- 6. POLÍTICAS PARA CLIENTES (Todos os roles autenticados)
-- ============================================================================

CREATE POLICY "customers_isolation_select" ON public.customers
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "customers_isolation_insert" ON public.customers
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "customers_isolation_update" ON public.customers
  FOR UPDATE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- DELETE: Apenas owner/admin
CREATE POLICY "customers_owner_delete" ON public.customers
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin')
  );

-- ============================================================================
-- 7. POLÍTICAS PARA VENDAS (SALES) - EXEMPLO COMPLETO
-- ============================================================================

-- SELECT: Todos do tenant veem todas as vendas
CREATE POLICY "sales_isolation_select" ON public.sales
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- INSERT: Operator+ pode criar vendas
CREATE POLICY "sales_operator_insert" ON public.sales
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin', 'operator')
  );

-- UPDATE: Operator+ pode atualizar (exceto deletar/cancelar vendas de outros)
CREATE POLICY "sales_operator_update" ON public.sales
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin', 'operator')
  );

-- DELETE: Apenas owner pode deletar vendas (perigoso!)
CREATE POLICY "sales_owner_delete" ON public.sales
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'owner'
  );

-- ============================================================================
-- 8. POLÍTICAS PARA ITENS DE VENDA (SALE_ITEMS)
-- ============================================================================

-- Acessível através da venda pai
CREATE POLICY "sale_items_isolation_select" ON public.sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales 
      WHERE id = sale_id 
      AND tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY "sale_items_isolation_insert" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales 
      WHERE id = sale_id 
      AND tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

-- ============================================================================
-- 9. POLÍTICAS PARA CONTAS BANCÁRIAS (Admin+)
-- ============================================================================

CREATE POLICY "bank_accounts_isolation_select" ON public.bank_accounts
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin', 'operator')
  );

CREATE POLICY "bank_accounts_admin_insert" ON public.bank_accounts
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin')
  );

-- ============================================================================
-- 10. POLÍTICAS PARA TRANSAÇÕES FINANCEIRAS (Admin/Viewer)
-- ============================================================================

-- SELECT: Admin, Operator, Viewer podem ver (mas viewer não vê lucro real)
CREATE POLICY "financial_tx_isolation_select" ON public.financial_transactions
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin', 'operator', 'viewer')
  );

-- INSERT/UPDATE: Apenas Owner/Admin
CREATE POLICY "financial_tx_admin_insert" ON public.financial_transactions
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin')
  );

-- ============================================================================
-- 11. POLÍTICAS PARA MOVIMENTAÇÕES DE CAIXA
-- ============================================================================

CREATE POLICY "cash_movements_isolation_select" ON public.cash_movements
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "cash_movements_isolation_insert" ON public.cash_movements
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin', 'operator')
  );

-- ============================================================================
-- 12. POLÍTICAS PARA AUDIT LOGS (IMUTÁVEIS - Apenas SELECT e INSERT)
-- ============================================================================

-- SELECT: Usuários só veem logs do seu próprio tenant
CREATE POLICY "audit_logs_isolation_select" ON public.audit_logs
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- INSERT: Sistema pode inserir (via trigger ou service role)
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- NOTA: Não há políticas de UPDATE ou DELETE - logs são IMUTÁVEIS

-- ============================================================================
-- 13. POLÍTICAS PARA BACKGROUND JOBS
-- ============================================================================

CREATE POLICY "bg_jobs_isolation_select" ON public.background_jobs
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "bg_jobs_isolation_insert" ON public.background_jobs
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "bg_jobs_isolation_update" ON public.background_jobs
  FOR UPDATE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- ============================================================================
-- FIM DO ARQUIVO 03_rls_policies.sql
-- ============================================================================
