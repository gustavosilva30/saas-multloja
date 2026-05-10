-- ============================================================================
-- WHATSAPP INTEGRATION (Evolution API)
-- ============================================================================

-- 1. Register module in catalog
INSERT INTO public.module_catalog (module_id, name, description, category, price, is_free)
VALUES (
  'whatsapp_integration',
  'Integração WhatsApp',
  'Envio de notificações, aprovação de OS e atendimento via WhatsApp.',
  'comunicacao',
  49.90,
  false
) ON CONFLICT (module_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 2. WhatsApp Instances table
CREATE TABLE IF NOT EXISTS whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    instance_name VARCHAR(100) NOT NULL, -- usually 'tenant_' + tenant_id
    instance_key VARCHAR(100), -- API key for this specific instance
    status VARCHAR(20) DEFAULT 'disconnected', -- connected, disconnected, connecting
    qrcode TEXT,
    phone VARCHAR(20),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, instance_name)
);

-- 3. WhatsApp Messages log (for tracking notifications)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    external_id VARCHAR(255), -- Evolution API message ID
    phone VARCHAR(20) NOT NULL,
    content TEXT,
    type VARCHAR(20) DEFAULT 'text',
    status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, read, failed
    direction VARCHAR(10) DEFAULT 'out', -- in, out
    related_entity_type VARCHAR(50), -- 'service_order', 'customer', etc.
    related_entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Triggers for updated_at
CREATE TRIGGER whatsapp_instances_updated_at BEFORE UPDATE ON whatsapp_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Indexes
CREATE INDEX idx_whatsapp_instances_tenant ON whatsapp_instances(tenant_id);
CREATE INDEX idx_whatsapp_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX idx_whatsapp_messages_phone ON whatsapp_messages(phone);
CREATE INDEX idx_whatsapp_messages_related ON whatsapp_messages(related_entity_type, related_entity_id);
