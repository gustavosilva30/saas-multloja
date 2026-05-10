-- ============================================================================
-- C4 — Row-Level Security (Tenant Isolation no PostgreSQL)
-- ============================================================================
-- Estratégia:
--   1. Função current_tenant_id() lê o GUC `app.tenant_id` setado por SET LOCAL
--      dentro de cada transação iniciada por withTenantContext (Node.js).
--   2. Cada tabela tenant-isolada recebe ENABLE + FORCE RLS e uma POLICY
--      `tenant_isolation` que filtra SELECT/INSERT/UPDATE/DELETE pelo tenant.
--   3. FORCE RLS aplica a regra ATÉ PARA O OWNER do schema — sem ele, o
--      superuser (usado em migrations) bypassaria RLS e veríamos vazamento.
--
-- IMPORTANTE — rede de segurança:
--   Por enquanto MANTEMOS os filtros `AND tenant_id = $X` no Node como cinto +
--   suspensório. Só após 2 semanas em produção sem incidente removeremos os
--   filtros redundantes em produção.
--
-- Rollback de emergência (caso de bug crítico em produção):
--   ALTER TABLE <tabela> DISABLE ROW LEVEL SECURITY;
--   DROP POLICY tenant_isolation ON <tabela>;
-- ============================================================================

-- ── 1. Função helper: lê o tenant atual de forma segura ──────────────────────
-- O segundo argumento `true` (missing_ok) faz a função retornar NULL ao invés
-- de erro se o GUC não estiver setado (ex: query feita pelo migrator).
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION current_tenant_id() IS
  'Lê o tenant_id da sessão (GUC app.tenant_id setado por withTenantContext). Retorna NULL se não setado.';

-- ── 2. Aplicar RLS nas tabelas mais sensíveis (piloto) ───────────────────────
-- Priorizamos finanças e família — onde IDOR teria maior impacto monetário e
-- de privacidade.
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'financial_transactions',
    'bank_accounts',
    'chart_of_accounts',
    'cost_centers',
    'family_groups',
    'family_members',
    'family_expenses'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Pula silenciosamente se a tabela ainda não existe (banco em estado
    -- intermediário durante migrations encadeadas).
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = tbl AND schemaname = 'public') THEN
      RAISE NOTICE 'RLS: tabela % não existe, pulando', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',  tbl);

    -- Drop primeiro caso a policy já exista (idempotência da migration)
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);

    -- Policy combinada para todos os comandos.
    -- USING       — filtra linhas em SELECT/UPDATE/DELETE
    -- WITH CHECK  — valida tenant_id em INSERT/UPDATE
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      USING       (tenant_id = current_tenant_id())
      WITH CHECK  (tenant_id = current_tenant_id())
    $f$, tbl);

    RAISE NOTICE 'RLS ativado em %', tbl;
  END LOOP;
END$$;

-- ── 3. Bypass para o role do migrator/seed ───────────────────────────────────
-- Migrations rodam fora de tenant context (criam DDL, fazem seed de
-- module_catalog etc). Para isso, o role usado no migrator deve ter o
-- atributo BYPASSRLS. Em produção:
--
--   CREATE ROLE migrator LOGIN PASSWORD '...' BYPASSRLS;
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO migrator;
--
-- E o app de runtime deve usar um role SEM BYPASSRLS:
--
--   CREATE ROLE app_runtime LOGIN PASSWORD '...';
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
--
-- Por enquanto (fase piloto), assume-se que o role do app já tem privilégio
-- suficiente e que o runMigrations() roda em janela controlada.
