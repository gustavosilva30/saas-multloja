-- ============================================================================
-- C4 / Fase 2 — Separação de Roles do PostgreSQL
-- ============================================================================
-- Sem isto, o RLS é uma mentira: se a aplicação conecta como `postgres` (ou
-- qualquer role com BYPASSRLS), as policies criadas em 11_rls_policies.sql
-- são silenciosamente ignoradas e qualquer bug no Node vaza dados entre
-- tenants — exatamente o que tentamos evitar.
--
-- Estratégia:
--   • migrator    — DDL + BYPASSRLS. Usado APENAS por runMigrations() no boot.
--   • app_runtime — só DML (SELECT/INSERT/UPDATE/DELETE) + SEM BYPASSRLS.
--                   É o role que o pool da aplicação usa em runtime.
--
-- ATENÇÃO:
--   1. Este script é IDEMPOTENTE — pode rodar várias vezes.
--   2. Em produção, defina senhas fortes via variável de ambiente, não no SQL.
--   3. Após rodar, defina:
--        DATABASE_URL_MIGRATOR=postgresql://migrator:<senha>@host:5432/db
--        DATABASE_URL_APP=postgresql://app_runtime:<senha>@host:5432/db
-- ============================================================================

-- ── Bloco DO para idempotência (CREATE ROLE não suporta IF NOT EXISTS) ───────
DO $$
BEGIN
  -- ── 1. Role migrator: superpowers controlados ──────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migrator') THEN
    -- Senha placeholder — TROQUE imediatamente após criação:
    --   ALTER ROLE migrator WITH PASSWORD 'senha-real-forte';
    CREATE ROLE migrator WITH
      LOGIN
      PASSWORD 'CHANGE_ME_MIGRATOR'
      BYPASSRLS                    -- pula RLS (necessário para DDL/seed cross-tenant)
      NOSUPERUSER
      NOCREATEROLE
      NOCREATEDB;
    RAISE NOTICE 'Role migrator criado. ALTERE A SENHA antes de usar em produção.';
  END IF;

  -- ── 2. Role app_runtime: privilégio mínimo ─────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime WITH
      LOGIN
      PASSWORD 'CHANGE_ME_APP_RUNTIME'
      NOBYPASSRLS                  -- 🔒 EXPLÍCITO: sofre RLS
      NOSUPERUSER
      NOCREATEROLE
      NOCREATEDB
      NOINHERIT;                   -- não herda atributos de roles pai
    RAISE NOTICE 'Role app_runtime criado. ALTERE A SENHA antes de usar em produção.';
  END IF;
END$$;

-- ── 3. Garantir flags corretas mesmo se os roles já existirem ────────────────
-- (Defesa contra alguém ter criado o role com BYPASSRLS por engano.)
ALTER ROLE migrator    WITH BYPASSRLS;
ALTER ROLE app_runtime WITH NOBYPASSRLS;

-- ── 4. Permissões: migrator (full) ───────────────────────────────────────────
DO $$ BEGIN EXECUTE format('GRANT ALL PRIVILEGES ON DATABASE %I TO migrator', current_database()); END $$;
GRANT ALL PRIVILEGES ON SCHEMA public TO migrator;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO migrator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO migrator;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO migrator;

-- Tabelas/sequences criadas no FUTURO também serão acessíveis
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO migrator;

-- ── 5. Permissões: app_runtime (DML apenas, sem DDL) ─────────────────────────
DO $$ BEGIN EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_runtime', current_database()); END $$;
GRANT USAGE   ON SCHEMA public TO app_runtime;

-- DML em tudo que existe agora
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO app_runtime;
GRANT EXECUTE                        ON ALL FUNCTIONS IN SCHEMA public TO app_runtime;

-- E em tudo que for criado no FUTURO (default privileges)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT                  ON SEQUENCES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE                        ON FUNCTIONS TO app_runtime;

-- ── 6. NEGAR explicitamente o que app_runtime NÃO deve ter ───────────────────
-- (Defesa explícita: deixa claro no schema que app_runtime não pode DDL.)
REVOKE CREATE ON SCHEMA public FROM app_runtime;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM app_runtime;

-- ── 7. Verificação final (apenas log) ────────────────────────────────────────
DO $$
DECLARE
  m_bypass BOOLEAN;
  a_bypass BOOLEAN;
BEGIN
  SELECT rolbypassrls INTO m_bypass FROM pg_roles WHERE rolname = 'migrator';
  SELECT rolbypassrls INTO a_bypass FROM pg_roles WHERE rolname = 'app_runtime';

  IF m_bypass IS NOT TRUE THEN
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: migrator deve ter BYPASSRLS.';
  END IF;
  IF a_bypass IS TRUE THEN
    RAISE EXCEPTION 'FALHA CRÍTICA DE SEGURANÇA: app_runtime tem BYPASSRLS — RLS está NEUTRALIZADO.';
  END IF;

  RAISE NOTICE 'Verificação OK: migrator=BYPASSRLS, app_runtime=NOBYPASSRLS';
END$$;
