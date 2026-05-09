-- ============================================================================
-- NEXUSERP - SCHEMA MULTITENANT COM ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Este arquivo contém todas as tabelas e políticas de segurança para isolamento
-- por tenant usando Supabase/PostgreSQL RLS.
-- ============================================================================

-- ============================================================================
-- 1. TABELAS BASE (Tenants e Perfis de Usuário)
-- ============================================================================

-- Tabela de Empresas/Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT UNIQUE, -- CNPJ/CPF
  phone TEXT,
  email TEXT,
  address JSONB,
  settings JSONB DEFAULT '{}',
  niche TEXT CHECK (niche IN ('varejo', 'oficina', 'clinica', 'restaurante', 'outros')),
  is_active BOOLEAN DEFAULT true,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Perfil de usuário vinculado ao auth.users do Supabase
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('owner', 'admin', 'operator', 'viewer')) NOT NULL DEFAULT 'operator',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_tenants_document ON public.tenants(document);

-- ============================================================================
-- 2. TABELAS DE NEGÓCIO (Vendas, Estoque, Financeiro)
-- ============================================================================

-- Categorias de produtos (por tenant)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#10B981',
  parent_id UUID REFERENCES public.categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produtos/Estoque
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  cost_price DECIMAL(10,2) DEFAULT 0,
  sale_price DECIMAL(10,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'UN',
  barcode TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, sku)
);

-- Clientes
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  address JSONB,
  birthday DATE,
  notes TEXT,
  credit_limit DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendas
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  user_id UUID REFERENCES public.user_profiles(id),
  sale_number TEXT,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'pending', 'paid', 'cancelled')) DEFAULT 'draft',
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itens da Venda
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financeiro - Contas a Pagar/Receber
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('INCOME', 'EXPENSE')) NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')) DEFAULT 'PENDING',
  payment_method TEXT,
  customer_id UUID REFERENCES public.customers(id),
  sale_id UUID REFERENCES public.sales(id),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contas Bancárias
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_name TEXT,
  agency TEXT,
  account_number TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings', 'investment')),
  initial_balance DECIMAL(10,2) DEFAULT 0,
  current_balance DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movimentações de Caixa/Conta
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  type TEXT CHECK (type IN ('IN', 'OUT')) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  transaction_id UUID REFERENCES public.financial_transactions(id),
  sale_id UUID REFERENCES public.sales(id),
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. ÍNDICES DE PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON public.categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_document ON public.customers(document);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_financial_tenant_id ON public.financial_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_due_date ON public.financial_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_status ON public.financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant_id ON public.bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_tenant_id ON public.cash_movements(tenant_id);

-- ============================================================================
-- 4. FUNÇÃO HOOK - INJEÇÃO DE TENANT_ID E ROLE NO JWT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims jsonb;
    user_role public.user_profiles.role%TYPE;
    user_tenant_id public.user_profiles.tenant_id%TYPE;
BEGIN
    -- Busca a role e o tenant do usuário
    SELECT role, tenant_id INTO user_role, user_tenant_id
    FROM public.user_profiles
    WHERE id = (event->>'user_id')::uuid;

    claims := event->'claims';

    -- Se o perfil existir, injeta as claims no app_metadata do JWT
    IF user_role IS NOT NULL THEN
        claims := jsonb_set(claims, '{app_metadata, tenant_id}', to_jsonb(user_tenant_id));
        claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(user_role));
    ELSE
        claims := jsonb_set(claims, '{app_metadata, tenant_id}', 'null'::jsonb);
        claims := jsonb_set(claims, '{app_metadata, user_role}', '"user"'::jsonb);
    END IF;

    -- Atualiza o evento de retorno
    event := jsonb_set(event, '{claims}', claims);
    
    RETURN event;
END;
$$;

-- ============================================================================
-- 5. HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. POLÍTICAS RLS - ISOLAMENTO POR TENANT
-- ============================================================================

-- --------------------------------------------------------
-- TENANTS: Apenas usuários da própria empresa podem ver
-- --------------------------------------------------------
CREATE POLICY "tenant_isolation_select" ON public.tenants
  FOR SELECT USING (id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "tenant_isolation_update" ON public.tenants
  FOR UPDATE USING (id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- --------------------------------------------------------
-- USER_PROFILES: Ver apenas usuários do mesmo tenant
-- --------------------------------------------------------
CREATE POLICY "user_profiles_isolation_select" ON public.user_profiles
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "user_profiles_isolation_insert" ON public.user_profiles
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "user_profiles_isolation_update" ON public.user_profiles
  FOR UPDATE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "user_profiles_isolation_delete" ON public.user_profiles
  FOR DELETE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- --------------------------------------------------------
-- CATEGORIES: Isolamento total por tenant
-- --------------------------------------------------------
CREATE POLICY "categories_isolation_select" ON public.categories
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "categories_isolation_insert" ON public.categories
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "categories_isolation_update" ON public.categories
  FOR UPDATE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "categories_isolation_delete" ON public.categories
  FOR DELETE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- --------------------------------------------------------
-- PRODUCTS: Isolamento total por tenant
-- --------------------------------------------------------
CREATE POLICY "products_isolation_select" ON public.products
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "products_isolation_insert" ON public.products
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin', 'operator')
  );

CREATE POLICY "products_isolation_update" ON public.products
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin', 'operator')
  );

CREATE POLICY "products_isolation_delete" ON public.products
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin')
  );

-- --------------------------------------------------------
-- CUSTOMERS: Isolamento total por tenant
-- --------------------------------------------------------
CREATE POLICY "customers_isolation_select" ON public.customers
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "customers_isolation_insert" ON public.customers
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "customers_isolation_update" ON public.customers
  FOR UPDATE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "customers_isolation_delete" ON public.customers
  FOR DELETE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- --------------------------------------------------------
-- SALES: Isolamento total por tenant
-- --------------------------------------------------------
CREATE POLICY "sales_isolation_select" ON public.sales
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "sales_isolation_insert" ON public.sales
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "sales_isolation_update" ON public.sales
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin')
      OR (
        (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'operator'
        AND user_id = (auth.jwt() ->> 'sub')::uuid
      )
    )
  );

CREATE POLICY "sales_isolation_delete" ON public.sales
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'owner'
  );

-- --------------------------------------------------------
-- SALE_ITEMS: Isolamento via tenant_id (não via sale_id)
-- --------------------------------------------------------
CREATE POLICY "sale_items_isolation_select" ON public.sale_items
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "sale_items_isolation_insert" ON public.sale_items
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "sale_items_isolation_update" ON public.sale_items
  FOR UPDATE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "sale_items_isolation_delete" ON public.sale_items
  FOR DELETE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- --------------------------------------------------------
-- FINANCIAL_TRANSACTIONS: Isolamento total por tenant
-- --------------------------------------------------------
CREATE POLICY "financial_isolation_select" ON public.financial_transactions
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "financial_isolation_insert" ON public.financial_transactions
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin', 'operator')
  );

CREATE POLICY "financial_isolation_update" ON public.financial_transactions
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin')
  );

CREATE POLICY "financial_isolation_delete" ON public.financial_transactions
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin')
  );

-- --------------------------------------------------------
-- BANK_ACCOUNTS: Isolamento total por tenant
-- --------------------------------------------------------
CREATE POLICY "bank_accounts_isolation_select" ON public.bank_accounts
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "bank_accounts_isolation_insert" ON public.bank_accounts
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "bank_accounts_isolation_update" ON public.bank_accounts
  FOR UPDATE USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "bank_accounts_isolation_delete" ON public.bank_accounts
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin')
  );

-- --------------------------------------------------------
-- CASH_MOVEMENTS: Isolamento total por tenant
-- --------------------------------------------------------
CREATE POLICY "cash_movements_isolation_select" ON public.cash_movements
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "cash_movements_isolation_insert" ON public.cash_movements
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "cash_movements_isolation_update" ON public.cash_movements
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin', 'operator')
  );

CREATE POLICY "cash_movements_isolation_delete" ON public.cash_movements
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('owner', 'admin')
  );

-- ============================================================================
-- 7. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 8. FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para obter o tenant_id do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter a role do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'user_role')::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. TABELA DE AUDIT LOGS (LOGS IMUTÁVEIS)
-- ============================================================================
-- Registra TODAS as alterações para auditoria
-- IMUTÁVEL: Nunca pode ser alterada ou deletada (apenas inserção)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id),
  user_email TEXT,
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'EXPORT', etc
  entity_type TEXT NOT NULL, -- 'sale', 'product', 'customer', 'financial_transaction', etc
  entity_id TEXT NOT NULL, -- ID da entidade afetada
  old_data JSONB, -- Dados anteriores (para UPDATE/DELETE)
  new_data JSONB, -- Dados novos (para CREATE/UPDATE)
  changed_fields TEXT[], -- Lista de campos alterados (apenas para UPDATE)
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}', -- Dados adicionais (ex: endpoint, método HTTP)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Garante imutabilidade - ninguém pode alterar ou deletar logs
  CONSTRAINT audit_logs_immutable CHECK (false) NO INHERIT
);

-- Índices para consultas rápidas de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Índice composto para consultas: "O que o usuário X alterou hoje?"
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON public.audit_logs(user_id, created_at DESC);

-- Índice para busca: "Todas alterações na venda Y"
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_lookup ON public.audit_logs(tenant_id, entity_type, entity_id, created_at DESC);

-- Habilitar RLS na tabela de audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver logs do seu próprio tenant
CREATE POLICY "audit_logs_isolation_select" ON public.audit_logs
  FOR SELECT USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Política: Apenas sistema pode inserir (via trigger ou service role)
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- NUNCA permitir UPDATE ou DELETE nos logs (imutabilidade)
-- Não criar políticas de UPDATE/DELETE = ninguém pode executar essas ações

-- ============================================================================
-- 10. FUNÇÕES DE AUDITORIA (TRIGGERS)
-- ============================================================================

-- Função genérica para registrar auditoria
CREATE OR REPLACE FUNCTION public.log_audit(
  p_tenant_id UUID,
  p_user_id UUID,
  p_user_email TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_changed_fields TEXT[] DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_logs (
    tenant_id,
    user_id,
    user_email,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    changed_fields
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_user_email,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_data,
    p_new_data,
    p_changed_fields
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auditoria automática de produtos
CREATE OR REPLACE FUNCTION public.audit_products_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_tenant_id UUID;
  v_changed_fields TEXT[] := ARRAY[]::TEXT[];
  v_key TEXT;
BEGIN
  -- Obter dados do usuário do JWT
  v_user_id := (auth.jwt() ->> 'sub')::UUID;
  v_user_email := auth.jwt() ->> 'email';
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      tenant_id, user_id, user_email, action, entity_type, entity_id, new_data
    ) VALUES (
      COALESCE(NEW.tenant_id, v_tenant_id), v_user_id, v_user_email, 'CREATE', 'product', NEW.id, to_jsonb(NEW)
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Detectar campos alterados
    FOR v_key IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      IF (to_jsonb(NEW) -> v_key) IS DISTINCT FROM (to_jsonb(OLD) -> v_key) THEN
        v_changed_fields := array_append(v_changed_fields, v_key);
      END IF;
    END LOOP;

    INSERT INTO public.audit_logs (
      tenant_id, user_id, user_email, action, entity_type, entity_id, 
      old_data, new_data, changed_fields
    ) VALUES (
      COALESCE(NEW.tenant_id, v_tenant_id), v_user_id, v_user_email, 'UPDATE', 'product', NEW.id,
      to_jsonb(OLD), to_jsonb(NEW), v_changed_fields
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      tenant_id, user_id, user_email, action, entity_type, entity_id, old_data
    ) VALUES (
      COALESCE(OLD.tenant_id, v_tenant_id), v_user_id, v_user_email, 'DELETE', 'product', OLD.id, to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auditoria de vendas (CRÍTICO para rastrear alterações no caixa)
CREATE OR REPLACE FUNCTION public.audit_sales_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_tenant_id UUID;
  v_changed_fields TEXT[] := ARRAY[]::TEXT[];
  v_key TEXT;
BEGIN
  v_user_id := (auth.jwt() ->> 'sub')::UUID;
  v_user_email := auth.jwt() ->> 'email';
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      tenant_id, user_id, user_email, action, entity_type, entity_id, new_data
    ) VALUES (
      COALESCE(NEW.tenant_id, v_tenant_id), v_user_id, v_user_email, 'CREATE', 'sale', NEW.id, to_jsonb(NEW)
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Detectar campos alterados (especialmente status e total)
    FOR v_key IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      IF (to_jsonb(NEW) -> v_key) IS DISTINCT FROM (to_jsonb(OLD) -> v_key) THEN
        v_changed_fields := array_append(v_changed_fields, v_key);
      END IF;
    END LOOP;

    INSERT INTO public.audit_logs (
      tenant_id, user_id, user_email, action, entity_type, entity_id, 
      old_data, new_data, changed_fields
    ) VALUES (
      COALESCE(NEW.tenant_id, v_tenant_id), v_user_id, v_user_email, 'UPDATE', 'sale', NEW.id,
      to_jsonb(OLD), to_jsonb(NEW), v_changed_fields
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      tenant_id, user_id, user_email, action, entity_type, entity_id, old_data
    ) VALUES (
      COALESCE(OLD.tenant_id, v_tenant_id), v_user_id, v_user_email, 'DELETE', 'sale', OLD.id, to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auditoria de transações financeiras
CREATE OR REPLACE FUNCTION public.audit_financial_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_tenant_id UUID;
  v_changed_fields TEXT[] := ARRAY[]::TEXT[];
  v_key TEXT;
BEGIN
  v_user_id := (auth.jwt() ->> 'sub')::UUID;
  v_user_email := auth.jwt() ->> 'email';
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      tenant_id, user_id, user_email, action, entity_type, entity_id, new_data
    ) VALUES (
      COALESCE(NEW.tenant_id, v_tenant_id), v_user_id, v_user_email, 'CREATE', 'financial_transaction', NEW.id, to_jsonb(NEW)
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    FOR v_key IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      IF (to_jsonb(NEW) -> v_key) IS DISTINCT FROM (to_jsonb(OLD) -> v_key) THEN
        v_changed_fields := array_append(v_changed_fields, v_key);
      END IF;
    END LOOP;

    INSERT INTO public.audit_logs (
      tenant_id, user_id, user_email, action, entity_type, entity_id, 
      old_data, new_data, changed_fields
    ) VALUES (
      COALESCE(NEW.tenant_id, v_tenant_id), v_user_id, v_user_email, 'UPDATE', 'financial_transaction', NEW.id,
      to_jsonb(OLD), to_jsonb(NEW), v_changed_fields
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      tenant_id, user_id, user_email, action, entity_type, entity_id, old_data
    ) VALUES (
      COALESCE(OLD.tenant_id, v_tenant_id), v_user_id, v_user_email, 'DELETE', 'financial_transaction', OLD.id, to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger genérico para qualquer tabela
CREATE OR REPLACE FUNCTION public.audit_generic_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_tenant_id UUID;
  v_entity_type TEXT;
BEGIN
  v_user_id := (auth.jwt() ->> 'sub')::UUID;
  v_user_email := auth.jwt() ->> 'email';
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;
  v_entity_type := TG_TABLE_NAME;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      tenant_id, user_id, user_email, action, entity_type, entity_id, new_data
    ) VALUES (
      COALESCE(NEW.tenant_id, v_tenant_id), v_user_id, v_user_email, 'CREATE', v_entity_type, NEW.id, to_jsonb(NEW)
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      tenant_id, user_id, user_email, action, entity_type, entity_id, 
      old_data, new_data
    ) VALUES (
      COALESCE(NEW.tenant_id, v_tenant_id), v_user_id, v_user_email, 'UPDATE', v_entity_type, NEW.id,
      to_jsonb(OLD), to_jsonb(NEW)
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      tenant_id, user_id, user_email, action, entity_type, entity_id, old_data
    ) VALUES (
      COALESCE(OLD.tenant_id, v_tenant_id), v_user_id, v_user_email, 'DELETE', v_entity_type, OLD.id, to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ativar triggers de auditoria nas tabelas críticas
DROP TRIGGER IF EXISTS audit_products_trigger ON public.products;
CREATE TRIGGER audit_products_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_products_changes();

DROP TRIGGER IF EXISTS audit_sales_trigger ON public.sales;
CREATE TRIGGER audit_sales_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.audit_sales_changes();

DROP TRIGGER IF EXISTS audit_financial_trigger ON public.financial_transactions;
CREATE TRIGGER audit_financial_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_changes();

-- Ativar auditoria genérica em outras tabelas
DROP TRIGGER IF EXISTS audit_customers_trigger ON public.customers;
CREATE TRIGGER audit_customers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_generic_changes();

-- ============================================================================
-- 11. FUNÇÕES DE CONSULTA DE AUDITORIA
-- ============================================================================

-- Função para buscar histórico de alterações de uma entidade
CREATE OR REPLACE FUNCTION public.get_entity_audit_history(
  p_tenant_id UUID,
  p_entity_type TEXT,
  p_entity_id TEXT
) RETURNS SETOF public.audit_logs AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.audit_logs
  WHERE tenant_id = p_tenant_id
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar alterações de um usuário específico
CREATE OR REPLACE FUNCTION public.get_user_audit_history(
  p_tenant_id UUID,
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS SETOF public.audit_logs AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.audit_logs
  WHERE tenant_id = p_tenant_id
    AND user_id = p_user_id
    AND created_at BETWEEN p_start_date AND p_end_date
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para detectar alterações suspeitas (ex: valor alterado fora do horário comercial)
CREATE OR REPLACE FUNCTION public.get_suspicious_changes(
  p_tenant_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days'
) RETURNS SETOF public.audit_logs AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.audit_logs
  WHERE tenant_id = p_tenant_id
    AND created_at >= p_start_date
    AND (
      -- Alterações em vendas canceladas
      (entity_type = 'sale' AND action = 'UPDATE' AND (new_data ->> 'status') = 'cancelled')
      OR
      -- Alterações no valor total
      (entity_type IN ('sale', 'financial_transaction') AND action = 'UPDATE' AND (old_data ->> 'total') IS DISTINCT FROM (new_data ->> 'total'))
      OR
      -- Alterações fora do horário comercial (antes 8h ou depois 20h)
      (EXTRACT(HOUR FROM created_at) < 8 OR EXTRACT(HOUR FROM created_at) > 20)
      OR
      -- Deleções (sempre suspeitas)
      (action = 'DELETE')
    )
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. COMENTÁRIOS DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE public.tenants IS 'Empresas/lojas cadastradas no sistema';
COMMENT ON TABLE public.user_profiles IS 'Perfis de usuário vinculados ao auth.users';
COMMENT ON TABLE public.products IS 'Catálogo de produtos por tenant';
COMMENT ON TABLE public.sales IS 'Registro de vendas';
COMMENT ON TABLE public.financial_transactions IS 'Contas a pagar/receber';
COMMENT ON FUNCTION public.custom_access_token_hook IS 'Hook que injeta tenant_id e user_role no JWT durante autenticação';
