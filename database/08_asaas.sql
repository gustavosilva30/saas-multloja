-- ============================================================================
-- ASAAS: coluna de vínculo do tenant com o cliente no gateway
-- Execute no pgweb (aba Query → Run Query)
-- ============================================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(50) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_tenants_asaas_customer_id
  ON tenants(asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;

-- Coluna para controle de status da assinatura
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20)
    DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'overdue', 'cancelled'));

INSERT INTO schema_migrations (version) VALUES (3) ON CONFLICT (version) DO NOTHING;
