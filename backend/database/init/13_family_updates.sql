-- Adiciona campos de renda e recorrência se não existirem
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(12,2) DEFAULT 0;

ALTER TABLE family_expenses ADD COLUMN IF NOT EXISTS is_recurrent BOOLEAN DEFAULT false;
ALTER TABLE family_expenses ADD COLUMN IF NOT EXISTS recurrence_period VARCHAR(20);
ALTER TABLE family_expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'DINHEIRO';

-- Tabela de rendas extras (caso não exista)
CREATE TABLE IF NOT EXISTS family_incomes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id          UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id         UUID REFERENCES family_members(id) ON DELETE SET NULL,
  amount            NUMERIC(12,2) NOT NULL,
  description       VARCHAR(255) NOT NULL,
  income_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurrent      BOOLEAN DEFAULT false,
  recurrence_period VARCHAR(20),
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de categorias personalizadas (caso não exista)
CREATE TABLE IF NOT EXISTS family_expense_categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       VARCHAR(50) NOT NULL,
  icon       VARCHAR(50) DEFAULT 'Wallet',
  color      VARCHAR(7) DEFAULT '#6b7280',
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
