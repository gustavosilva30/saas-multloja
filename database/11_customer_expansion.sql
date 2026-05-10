-- ============================================================================
-- EXPANSÃO DA TABELA DE CLIENTES
-- Adiciona campos de redes sociais, tipo de pessoa, rating e saldo
-- ============================================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS person_type VARCHAR(2) DEFAULT 'PF' CHECK (person_type IN ('PF', 'PJ'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rg VARCHAR(30);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone2 VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS instagram VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(1) CHECK (gender IN ('M', 'F', 'O'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0 CHECK (rating BETWEEN 0 AND 5);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(10,2) DEFAULT 0;

-- Registrar migração
INSERT INTO schema_migrations (version) VALUES (11) ON CONFLICT (version) DO NOTHING;
