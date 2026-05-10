-- ============================================================================
-- FINANCEIRO ERP — Plano de Contas, Centros de Custo, Expansão de Transações
-- Migration segura: usa ADD COLUMN IF NOT EXISTS e CREATE TABLE IF NOT EXISTS
-- ============================================================================

-- ── 1. Plano de Contas (DRE/Balanço) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  code        VARCHAR(20),           -- ex: 1.1.2 (gerado ou manual)
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(20) NOT NULL   -- REVENUE | EXPENSE | ASSET | LIABILITY | EQUITY
              CHECK (type IN ('REVENUE','EXPENSE','ASSET','LIABILITY','EQUITY')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

-- Categorias padrão (inseridas por tenant no momento do registro — gerenciadas por trigger ou API)
CREATE INDEX IF NOT EXISTS idx_coa_tenant    ON chart_of_accounts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_parent    ON chart_of_accounts (parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_type      ON chart_of_accounts (tenant_id, type);

-- ── 2. Centros de Custo ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cost_centers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(50),
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_tenant ON cost_centers (tenant_id);

-- ── 3. Contas Bancárias — colunas extras ─────────────────────────────────────
ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'CHECKING'
    CHECK (type IN ('CHECKING','SAVINGS','CASH','INVESTMENT')),
  ADD COLUMN IF NOT EXISTS color       VARCHAR(7)  DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS bank_name   VARCHAR(100);

-- ── 4. Transações Financeiras — expansão ERP ──────────────────────────────────
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS chart_of_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_center_id      UUID REFERENCES cost_centers(id)      ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id          UUID REFERENCES customers(id)          ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS competence_date     DATE,          -- regime de competência (DRE)
  ADD COLUMN IF NOT EXISTS installment_number  SMALLINT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_total   SMALLINT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrent_group_id  UUID,          -- agrupa lançamentos recorrentes
  ADD COLUMN IF NOT EXISTS is_conciliated      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ofx_transaction_id  VARCHAR(255),  -- FITID do OFX (anti-duplicata)
  ADD COLUMN IF NOT EXISTS tags                TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attachment_url      VARCHAR(500);

-- Índice único para não importar o mesmo extrato duas vezes
CREATE UNIQUE INDEX IF NOT EXISTS idx_ft_ofx_dedup
  ON financial_transactions (tenant_id, bank_account_id, ofx_transaction_id)
  WHERE ofx_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ft_due_date       ON financial_transactions (tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_ft_competence     ON financial_transactions (tenant_id, competence_date);
CREATE INDEX IF NOT EXISTS idx_ft_status         ON financial_transactions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ft_recurrent      ON financial_transactions (recurrent_group_id);
CREATE INDEX IF NOT EXISTS idx_ft_conciliation   ON financial_transactions (tenant_id, is_conciliated, bank_account_id);

-- ── 5. Régua de Cobrança ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_rules (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  days_offset      INTEGER NOT NULL,  -- negativo = antes do vencimento, positivo = após
  channel          VARCHAR(20) NOT NULL DEFAULT 'whatsapp'
                   CHECK (channel IN ('whatsapp','email','sms')),
  message_template TEXT NOT NULL,     -- suporta {{name}}, {{amount}}, {{due_date}}, {{days}}
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log de disparos (evita reenvio)
CREATE TABLE IF NOT EXISTS billing_rule_executions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  billing_rule_id         UUID NOT NULL REFERENCES billing_rules(id) ON DELETE CASCADE,
  financial_transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
  sent_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  channel                 VARCHAR(20),
  status                  VARCHAR(20) DEFAULT 'sent',  -- sent | failed
  error_message           TEXT,
  UNIQUE (billing_rule_id, financial_transaction_id)   -- não envia 2x pela mesma régua
);

CREATE INDEX IF NOT EXISTS idx_br_tenant    ON billing_rules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_bre_rule     ON billing_rule_executions (billing_rule_id);
CREATE INDEX IF NOT EXISTS idx_bre_txn      ON billing_rule_executions (financial_transaction_id);

-- ── 6. Seed: Plano de Contas padrão (executado via função) ───────────────────
-- Chamado pela API ao registrar novo tenant (não inserido aqui para não
-- depender de tenant_id concreto neste arquivo estático).
-- Ver: FinanceService.seedChartOfAccounts(tenantId)
