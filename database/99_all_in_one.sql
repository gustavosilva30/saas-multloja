-- ============================================================================
-- NEXUSERP - SCRIPT COMPLETO (ALL-IN-ONE)
-- ============================================================================
-- ATENÇÃO: Este arquivo concatena TODOS os scripts SQL
-- Execute no Supabase SQL Editor para configurar tudo de uma vez
-- 
-- ORDEM INCLUÍDA:
-- 1. Schema e Tabelas
-- 2. Auth Hooks
-- 3. RLS Policies
-- 4. Triggers
-- 5. Sistema de Auditoria
-- 6. Dados Iniciais (opcional - comente se não quiser)
-- ============================================================================

\echo '========================================'
\echo 'INICIANDO CONFIGURAÇÃO DO NEXUSERP'
\echo '========================================'

-- ============================================================================
-- PARTE 1: SCHEMA E TABELAS
-- ============================================================================

\echo 'Criando tabelas...'

-- Tabela de Empresas/Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT UNIQUE,
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

-- Categorias de produtos
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
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  total DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'partial')) DEFAULT 'pending',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itens da venda
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  metadata JSONB DEFAULT '{}'
);

-- Contas bancárias
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_code TEXT,
  agency TEXT,
  account_number TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings', 'investment')) DEFAULT 'checking',
  initial_balance DECIMAL(10,2) DEFAULT 0,
  current_balance DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transações financeiras
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  type TEXT CHECK (type IN ('income', 'expense', 'transfer')) NOT NULL,
  category TEXT,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  payment_date DATE,
  status TEXT CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
  related_sale_id UUID REFERENCES public.sales(id),
  related_customer_id UUID REFERENCES public.customers(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movimentações de caixa
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  type TEXT CHECK (type IN ('in', 'out')) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  transaction_id UUID REFERENCES public.financial_transactions(id),
  sale_id UUID REFERENCES public.sales(id),
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs (IMUTÁVEL)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id),
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT audit_logs_immutable CHECK (false) NO INHERIT
);

-- Background Jobs
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')) DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

\echo '✅ Tabelas criadas!'

-- ============================================================================
-- PARTE 2: ÍNDICES
-- ============================================================================

\echo 'Criando índices...'

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_tenants_document ON public.tenants(document);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_document ON public.customers(document);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant_id ON public.bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_tx_tenant_id ON public.financial_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_tx_due_date ON public.financial_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_tx_status ON public.financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_cash_movements_tenant_id ON public.cash_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at ON public.cash_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_tenant_id ON public.background_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_status ON public.background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_priority ON public.background_jobs(priority DESC);

\echo '✅ Índices criados!'

-- ============================================================================
-- PARTE 3: AUTH HOOKS
-- ============================================================================

\echo 'Configurando auth hooks...'

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
    SELECT role, tenant_id INTO user_role, user_tenant_id
    FROM public.user_profiles
    WHERE id = (event->>'user_id')::uuid;

    claims := event->'claims';

    IF user_role IS NOT NULL THEN
        claims := jsonb_set(claims, '{app_metadata, tenant_id}', to_jsonb(user_tenant_id));
        claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(user_role));
    ELSE
        claims := jsonb_set(claims, '{app_metadata, tenant_id}', 'null'::jsonb);
        claims := jsonb_set(claims, '{app_metadata, user_role}', '"viewer"'::jsonb);
    END IF;

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'user_role')::text;
EXCEPTION
  WHEN OTHERS THEN RETURN 'viewer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

\echo '✅ Auth hooks configurados!'

-- ============================================================================
-- PARTE 4: RLS POLICIES
-- ============================================================================

\echo 'Configurando RLS...'

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

-- Políticas simplificadas (tenants)
CREATE POLICY "tenant_isolation" ON public.tenants FOR ALL
  USING (id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Políticas de isolamento padrão para todas as tabelas
CREATE POLICY "isolation_select" ON public.user_profiles FOR SELECT
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid OR id = auth.uid());

CREATE POLICY "isolation_all" ON public.categories FOR ALL
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "isolation_all" ON public.products FOR ALL
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "isolation_all" ON public.customers FOR ALL
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "isolation_select" ON public.sales FOR SELECT
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "isolation_insert" ON public.sales FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "isolation_update" ON public.sales FOR UPDATE
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "isolation_select" ON public.sale_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sales WHERE id = sale_id AND tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

CREATE POLICY "isolation_all" ON public.bank_accounts FOR ALL
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "isolation_all" ON public.financial_transactions FOR ALL
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "isolation_all" ON public.cash_movements FOR ALL
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "isolation_all" ON public.background_jobs FOR ALL
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

\echo '✅ RLS configurado!'

-- ============================================================================
-- PARTE 5: TRIGGERS
-- ============================================================================

\echo 'Criando triggers...'

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

\echo '✅ Triggers criados!'

-- ============================================================================
-- PARTE 6: SISTEMA DE AUDITORIA
-- ============================================================================

\echo 'Configurando sistema de auditoria...'

CREATE OR REPLACE FUNCTION public.log_audit(
  p_tenant_id UUID, p_user_id UUID, p_user_email TEXT, p_action TEXT,
  p_entity_type TEXT, p_entity_id TEXT, p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL, p_changed_fields TEXT[] DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_logs (tenant_id, user_id, user_email, action,
    entity_type, entity_id, old_data, new_data, changed_fields)
  VALUES (p_tenant_id, p_user_id, p_user_email, p_action, p_entity_type,
    p_entity_id, p_old_data, p_new_data, p_changed_fields);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.audit_generic_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID; v_user_email TEXT; v_tenant_id UUID;
BEGIN
  v_user_id := (auth.jwt() ->> 'sub')::UUID;
  v_user_email := auth.jwt() ->> 'email';
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (tenant_id, user_id, user_email, action,
      entity_type, entity_id, new_data)
    VALUES (COALESCE(NEW.tenant_id, v_tenant_id), v_user_id, v_user_email,
      'CREATE', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (tenant_id, user_id, user_email, action,
      entity_type, entity_id, old_data, new_data)
    VALUES (COALESCE(NEW.tenant_id, v_tenant_id), v_user_id, v_user_email,
      'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (tenant_id, user_id, user_email, action,
      entity_type, entity_id, old_data)
    VALUES (COALESCE(OLD.tenant_id, v_tenant_id), v_user_id, v_user_email,
      'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ativar auditoria nas tabelas principais
DROP TRIGGER IF EXISTS audit_products_trigger ON public.products;
CREATE TRIGGER audit_products_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_generic_changes();

DROP TRIGGER IF EXISTS audit_sales_trigger ON public.sales;
CREATE TRIGGER audit_sales_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.audit_generic_changes();

DROP TRIGGER IF EXISTS audit_customers_trigger ON public.customers;
CREATE TRIGGER audit_customers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_generic_changes();

\echo '✅ Sistema de auditoria configurado!'

-- ============================================================================
-- PARTE 7: DADOS INICIAIS (Opcional - comente se não quiser)
-- ============================================================================

\echo 'Inserindo dados de exemplo...'

INSERT INTO public.tenants (id, name, document, phone, email, niche, subscription_tier)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Loja Exemplo LTDA',
  '12.345.678/0001-99', '(11) 98765-4321', 'contato@lojaexemplo.com', 'varejo', 'pro')
ON CONFLICT (id) DO NOTHING;

\echo '✅ Dados iniciais inseridos!'

-- ============================================================================
-- FINALIZAÇÃO
-- ============================================================================

\echo ''
\echo '========================================'
\echo '✅ CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!'
\echo '========================================'
\echo ''
\echo 'Próximos passos:'
\echo '1. Configure o Auth Hook no Dashboard do Supabase'
\echo '2. Configure as URLs de redirecionamento'
\echo '3. Teste a conexão com sua aplicação'
\echo '4. Consulte database/README.md para mais detalhes'
\echo ''
