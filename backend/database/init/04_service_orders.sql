-- ============================================================================
-- SERVICE ORDERS (OS) — Ordens de Serviço
-- ============================================================================

-- ── Status enum ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE os_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'IN_PROGRESS',
    'WAITING_PARTS',
    'COMPLETED',
    'CANCELED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE os_item_type AS ENUM ('PRODUCT', 'SERVICE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── service_orders ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  assignee_id     UUID REFERENCES user_profiles(id) ON DELETE SET NULL, -- técnico responsável

  -- Número sequencial legível (por tenant)
  os_number       INTEGER NOT NULL,

  status          os_status NOT NULL DEFAULT 'DRAFT',

  -- Dados dinâmicos do objeto consertado (placa, IMEI, modelo, etc.)
  asset_metadata  JSONB NOT NULL DEFAULT '{}',

  -- Datas de controle
  expected_at     DATE,
  started_at      TIMESTAMP WITH TIME ZONE,
  completed_at    TIMESTAMP WITH TIME ZONE,

  -- Valores calculados (denormalizados para consultas rápidas)
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Notas
  internal_notes  TEXT,
  customer_notes  TEXT,

  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE (tenant_id, os_number)
);

-- Sequência por tenant via função
CREATE OR REPLACE FUNCTION next_os_number(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(os_number), 0) + 1
    INTO v_next
    FROM service_orders
   WHERE tenant_id = p_tenant_id;
  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- ── service_order_items ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id           UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,

  item_type       os_item_type NOT NULL,

  -- Obrigatório quando item_type = 'PRODUCT', NULL quando 'SERVICE'
  product_id      UUID REFERENCES products(id) ON DELETE RESTRICT,

  -- Técnico que executou (para relatórios de comissão)
  technician_id   UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  description     VARCHAR(500) NOT NULL,  -- nome do serviço ou produto (snapshot)
  quantity        DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_price      DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price     DECIMAL(10,2) GENERATED ALWAYS AS
                    (ROUND((quantity * unit_price) - discount, 2)) STORED,

  -- Registra se o estoque já foi baixado (evita dupla dedução)
  stock_deducted  BOOLEAN NOT NULL DEFAULT false,

  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT chk_product_required CHECK (
    item_type <> 'PRODUCT' OR product_id IS NOT NULL
  )
);

-- ── Histórico de status ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_order_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id       UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  changed_by  UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  from_status os_status,
  to_status   os_status NOT NULL,
  note        TEXT,
  changed_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_service_orders_tenant    ON service_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer  ON service_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status    ON service_orders (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_service_orders_assignee  ON service_orders (assignee_id);
CREATE INDEX IF NOT EXISTS idx_so_items_os              ON service_order_items (os_id);
CREATE INDEX IF NOT EXISTS idx_so_items_product         ON service_order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_so_status_history_os     ON service_order_status_history (os_id);
