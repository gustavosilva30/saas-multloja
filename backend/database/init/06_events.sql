-- ============================================================================
-- EVENTOS & CHECK-IN POR QR CODE
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('DRAFT', 'PUBLISHED', 'ONGOING', 'FINISHED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── events ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  date        TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date    TIMESTAMP WITH TIME ZONE,
  location    VARCHAR(500),
  banner_url  VARCHAR(500),
  status      event_status NOT NULL DEFAULT 'DRAFT',
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── event_ticket_types ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_ticket_types (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,  -- ex: VIP, Pista, Camarote
  description TEXT,
  price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  capacity    INTEGER NOT NULL DEFAULT 100,
  color       VARCHAR(7) DEFAULT '#10b981',
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── event_guests ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_guests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id  UUID REFERENCES event_ticket_types(id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(50),           -- para envio do ingresso via WA
  document        VARCHAR(50),           -- CPF/passaporte
  qr_code_token   UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  check_in_status BOOLEAN NOT NULL DEFAULT false,
  check_in_time   TIMESTAMP WITH TIME ZONE,
  checked_in_by   UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  ticket_sent_at  TIMESTAMP WITH TIME ZONE,  -- quando o WA foi disparado
  notes           TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_tenant          ON events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_status          ON events (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ticket_types_event     ON event_ticket_types (event_id);
CREATE INDEX IF NOT EXISTS idx_guests_event           ON event_guests (event_id);
CREATE INDEX IF NOT EXISTS idx_guests_qr              ON event_guests (qr_code_token); -- varredura na portaria
CREATE INDEX IF NOT EXISTS idx_guests_check_in        ON event_guests (event_id, check_in_status);
