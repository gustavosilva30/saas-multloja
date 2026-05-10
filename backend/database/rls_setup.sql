-- ── 1. Função para capturar o tenant da sessão ──
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- ── 2. Lista de tabelas para aplicar RLS ──
-- Adicione aqui todas as tabelas que possuem a coluna tenant_id
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'bank_accounts', 'customers', 'products', 'sales', 'service_orders', 
        'financial_transactions', 'user_profiles', 'whatsapp_instances',
        'family_groups', 'family_members', 'family_expenses', 'family_goals', 'family_tasks'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Habilita RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
        
        -- Remove políticas antigas se existirem para evitar erro
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I', t);
        
        -- Cria a nova política global
        EXECUTE format('
            CREATE POLICY tenant_isolation_policy ON %I
            USING (tenant_id = current_tenant_id())
            WITH CHECK (tenant_id = current_tenant_id())
        ', t);
    END LOOP;
END $$;
