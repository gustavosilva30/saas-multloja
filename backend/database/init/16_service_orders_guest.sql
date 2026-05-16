-- ============================================================================
-- ADD GUEST SUPPORT TO SERVICE ORDERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS guest_document VARCHAR(50),
ADD COLUMN IF NOT EXISTS guest_address TEXT;

-- Adicionar campo para controlar se é um rascunho/orçamento
-- (O status já possui 'DRAFT' e 'PENDING_APPROVAL', o que é suficiente)
