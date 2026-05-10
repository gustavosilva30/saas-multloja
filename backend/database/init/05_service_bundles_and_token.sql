-- ============================================================================
-- SERVICE BUNDLES (Motor de Kits) + PUBLIC TOKEN (Aprovação Digital)
-- ============================================================================

-- ── 1. Kits: serviços que injetam produtos automaticamente ────────────────────
-- Um registro associa um produto-serviço (ex: "Troca de Óleo") a um produto
-- físico (ex: "Litro de Óleo 5W30") com quantidade padrão.
CREATE TABLE IF NOT EXISTS service_product_bundles (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Produto que representa o SERVIÇO (item_type = SERVICE).
  -- Quando este serviço for adicionado a uma OS, os produtos do kit
  -- serão injetados automaticamente.
  service_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Produto físico a ser injetado (item_type = PRODUCT)
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  default_quantity   DECIMAL(10,3) NOT NULL DEFAULT 1 CHECK (default_quantity > 0),
  is_active          BOOLEAN NOT NULL DEFAULT true,

  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE (tenant_id, service_product_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_bundles_service ON service_product_bundles (service_product_id);
CREATE INDEX IF NOT EXISTS idx_bundles_tenant  ON service_product_bundles (tenant_id);

-- ── 2. Token de aprovação pública ─────────────────────────────────────────────
-- Adicionado à tabela service_orders para gerar links únicos por OS.
-- gen_random_uuid() é da extensão pgcrypto (já habilitada no 01_schema.sql).
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS access_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Índice único para busca rápida pelo token público
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_orders_access_token
  ON service_orders (access_token);
