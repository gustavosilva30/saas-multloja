-- ============================================================================
-- 15. QUOTES & QUOTE ITEMS
-- ============================================================================

-- Garante que a função de trigger exista
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Número sequencial legível por tenant
    quote_number INTEGER NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'expired', 'converted', 'cancelled')) DEFAULT 'pending',
    
    -- Dados de cliente avulso (para quando não está no CRM)
    guest_name VARCHAR(255),
    guest_phone VARCHAR(50),
    guest_document VARCHAR(50),
    guest_address TEXT,
    
    -- Valores
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0,
    shipping DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    validity_days INTEGER DEFAULT 30,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE (tenant_id, quote_number)
);

CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    description VARCHAR(500) NOT NULL, -- nome do produto ou descrição avulsa
    is_adhoc BOOLEAN DEFAULT false,
    
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função para gerar o próximo número de orçamento por tenant
CREATE OR REPLACE FUNCTION next_quote_number(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(quote_number), 0) + 1
    INTO v_next
    FROM quotes
   WHERE tenant_id = p_tenant_id;
  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- Índices
CREATE INDEX idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);

-- Trigger para updated_at
CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
