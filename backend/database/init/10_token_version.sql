-- ============================================================================
-- C6 — Token versioning para invalidação de Refresh Tokens
-- ============================================================================
-- Cada vez que o user faz logout (ou tem a senha trocada), incrementamos esse
-- contador. O JWT de refresh carrega o tokenVersion do momento da emissão;
-- se não bater com o atual no DB, é rejeitado. Isso permite revogar TODAS as
-- sessões de um usuário sem precisar manter blacklist de tokens em memória.
-- ============================================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- Mesma proteção para os admins da plataforma
ALTER TABLE platform_admins
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
