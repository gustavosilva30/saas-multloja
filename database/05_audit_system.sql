-- ============================================================================
-- NEXUSERP - 05: SISTEMA DE AUDITORIA (AUDIT LOGS)
-- ============================================================================
-- Execute este arquivo QUINTO no PostgreSQL
-- Cria triggers de auditoria para rastrear todas as alterações
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO GENÉRICA PARA REGISTRAR AUDITORIA
-- ============================================================================

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

-- ============================================================================
-- 2. TRIGGER: Auditoria de Produtos
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_products_changes()
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
      COALESCE(NEW.tenant_id, v_tenant_id), v_user_id, v_user_email, 'CREATE', 'product', NEW.id, to_jsonb(NEW)
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

-- ============================================================================
-- 3. TRIGGER: Auditoria de Vendas (CRÍTICO)
-- ============================================================================

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

-- ============================================================================
-- 4. TRIGGER: Auditoria de Transações Financeiras
-- ============================================================================

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

-- ============================================================================
-- 5. TRIGGER: Auditoria Genérica (para outras tabelas)
-- ============================================================================

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

-- ============================================================================
-- 6. ATIVAR TRIGGERS DE AUDITORIA
-- ============================================================================

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

DROP TRIGGER IF EXISTS audit_customers_trigger ON public.customers;
CREATE TRIGGER audit_customers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_generic_changes();

-- ============================================================================
-- 7. FUNÇÕES DE CONSULTA DE AUDITORIA
-- ============================================================================

-- Histórico de uma entidade específica
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

-- Histórico de um usuário específico
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

-- Alterações suspeitas (para monitoramento de fraude)
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
      -- Vendas canceladas
      (entity_type = 'sale' AND action = 'UPDATE' AND (new_data ->> 'status') = 'cancelled')
      OR
      -- Alterações de valor
      (entity_type IN ('sale', 'financial_transaction') AND action = 'UPDATE' 
       AND (old_data ->> 'total') IS DISTINCT FROM (new_data ->> 'total'))
      OR
      -- Fora do horário comercial
      (EXTRACT(HOUR FROM created_at) < 8 OR EXTRACT(HOUR FROM created_at) > 20)
      OR
      -- Deleções (sempre suspeitas)
      (action = 'DELETE')
    )
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIM DO ARQUIVO 05_audit_system.sql
-- ============================================================================
