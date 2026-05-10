-- ============================================================================
-- GESTÃO FAMILIAR — Family Hub, Shared Wallet, Tasks, Calendar
-- ============================================================================

-- ── 1. Grupos Familiares ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_groups (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  whatsapp_group_id VARCHAR(100),   -- JID do grupo no WhatsApp (Evolution API)
  avatar_url   VARCHAR(500),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fg_tenant ON family_groups (tenant_id);

-- ── 2. Membros ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id     UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  role         VARCHAR(10) NOT NULL DEFAULT 'ADULT'
               CHECK (role IN ('ADMIN','ADULT','CHILD')),
  pin_code     VARCHAR(6),           -- hash bcrypt do PIN de acesso rápido
  avatar_color VARCHAR(7) DEFAULT '#10b981',
  avatar_emoji VARCHAR(10) DEFAULT '😊',
  points       INTEGER NOT NULL DEFAULT 0,
  income_share NUMERIC(5,2) DEFAULT 50.00,  -- % da renda (para split PROPORTIONAL)
  phone        VARCHAR(20),          -- para notificações individuais
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_group  ON family_members (group_id);
CREATE INDEX IF NOT EXISTS idx_fm_tenant ON family_members (tenant_id);

-- ── 3. Despesas Compartilhadas ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_expenses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id          UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  paid_by_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE RESTRICT,
  amount            NUMERIC(12,2) NOT NULL,
  description       VARCHAR(255) NOT NULL,
  category          VARCHAR(50) DEFAULT 'GENERAL'
                    CHECK (category IN ('FOOD','HOUSING','TRANSPORT','HEALTH','EDUCATION','LEISURE','GENERAL')),
  split_type        VARCHAR(15) NOT NULL DEFAULT 'EQUAL'
                    CHECK (split_type IN ('EQUAL','PROPORTIONAL','CUSTOM')),
  expense_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url       VARCHAR(500),
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fe_group      ON family_expenses (group_id);
CREATE INDEX IF NOT EXISTS idx_fe_tenant     ON family_expenses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_fe_date       ON family_expenses (group_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_fe_paid_by    ON family_expenses (paid_by_member_id);

-- Splits customizados por membro (só usado quando split_type = 'CUSTOM')
CREATE TABLE IF NOT EXISTS family_expense_splits (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id    UUID NOT NULL REFERENCES family_expenses(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  amount        NUMERIC(12,2) NOT NULL,
  UNIQUE (expense_id, member_id)
);

-- ── 4. Metas de Economia ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_goals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id      UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title         VARCHAR(150) NOT NULL,
  description   TEXT,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  target_date   DATE,
  emoji         VARCHAR(10) DEFAULT '🎯',
  color         VARCHAR(7) DEFAULT '#10b981',
  status        VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE','COMPLETED','CANCELLED')),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fg_goals_group ON family_goals (group_id);

-- ── 5. Tarefas Gamificadas ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_tasks (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id              UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_to_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  created_by_member_id  UUID REFERENCES family_members(id) ON DELETE SET NULL,
  title                 VARCHAR(200) NOT NULL,
  description           TEXT,
  points_reward         INTEGER NOT NULL DEFAULT 10
                        CHECK (points_reward BETWEEN 1 AND 500),
  status                VARCHAR(15) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','DONE','CANCELLED')),
  due_date              DATE,
  completed_at          TIMESTAMP WITH TIME ZONE,
  recurrent             BOOLEAN NOT NULL DEFAULT false,
  recurrent_days        INTEGER,   -- repetir a cada N dias
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ft_group    ON family_tasks (group_id);
CREATE INDEX IF NOT EXISTS idx_ft_assignee ON family_tasks (assigned_to_member_id);
CREATE INDEX IF NOT EXISTS idx_ft_status   ON family_tasks (group_id, status);

-- ── 6. Calendário Familiar ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id     UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id    UUID REFERENCES family_members(id) ON DELETE SET NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  event_date   TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date     TIMESTAMP WITH TIME ZONE,
  type         VARCHAR(15) NOT NULL DEFAULT 'GENERAL'
               CHECK (type IN ('SCHOOL','MEDICAL','COUPLE','BIRTHDAY','GENERAL')),
  all_day      BOOLEAN NOT NULL DEFAULT false,
  location     VARCHAR(255),
  color        VARCHAR(7),
  notified     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fe_group_date ON family_events (group_id, event_date);
CREATE INDEX IF NOT EXISTS idx_fe_notify     ON family_events (event_date, notified);
