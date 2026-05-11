-- ============================================================================
-- CATÁLOGO DE MÓDULOS COM PRECIFICAÇÃO
-- Execute no pgweb (aba Query → Run Query)
-- ============================================================================

-- Tabela de catálogo: preços e metadados de cada módulo
CREATE TABLE IF NOT EXISTS module_catalog (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id     VARCHAR(50) NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  category      VARCHAR(50) DEFAULT 'Operação',
  price         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_free       BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status de pagamento por módulo por tenant
ALTER TABLE tenant_modules
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'free'
    CHECK (payment_status IN ('free', 'pending', 'paid', 'overdue', 'cancelled')),
  ADD COLUMN IF NOT EXISTS asaas_payment_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Trigger de updated_at
CREATE TRIGGER module_catalog_updated_at
  BEFORE UPDATE ON module_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed: todos os módulos com preços padrão (admin pode alterar depois)
INSERT INTO module_catalog (module_id, name, description, category, price, is_free, sort_order) VALUES
  ('dashboard',    'Dashboard',            'Visão geral do negócio com métricas em tempo real', 'Gestão',     0.00,  true,  1),
  ('pos',          'Frente de Caixa (PDV)','Venda rápida no balcão com leitor de código de barras', 'Vendas',  0.00,  true,  2),
  ('stock',        'Gestão de Estoque',    'Controle de SKUs, categorias e alertas de estoque baixo', 'Operação', 0.00, true, 3),
  ('customers',    'CRM de Clientes',      'Histórico de compras, aniversários e carteira por vendedor', 'Vendas', 0.00, true, 4),
  ('finance',      'Financeiro Avançado',  'Contas a pagar/receber, DRE, fluxo de caixa', 'Gestão',          49.90, false, 5),
  ('services',     'Ordens de Serviço',    'Ideal para oficinas e assistência técnica', 'Operação',           49.90, false, 6),
  ('catalog',      'Catálogo Técnico',     'Vinculação de produtos a aplicações (veículos, máquinas)', 'Operação', 29.90, false, 7),
  ('events',       'Gestão de Eventos',    'Criação de eventos, ingressos e check-in via QR Code', 'Atendimento', 39.90, false, 8),
  ('automations',  'Automações',           'Integração via Webhooks (n8n, Zapier) baseada em eventos', 'Integração', 59.90, false, 9),
  ('ai_assistant', 'Assistente Financeiro IA', 'Lançamento de despesas por áudio/texto nativo', 'Avançado',   79.90, false, 10),
  ('ecommerce',    'Integração E-commerce','Conecta seu estoque com Nuvemshop, Shopify e Mercado Livre', 'Integração', 69.90, false, 11),
  ('marketing',    'Marketing SMS/Email',  'Automações de recuperação de clientes e promoções', 'Marketing',  49.90, false, 12),
  ('delivery',     'App de Entregadores',  'Roteirização e aplicativo exclusivo para motoboys', 'Logística',  59.90, false, 13),
  ('image_editor', 'Editor de Imagens',    'Criação de artes e banners para redes sociais', 'Marketing',     19.90, false, 14),
  ('file_converter','Conversor de Arquivos','Conversão rápida de PDF, Word e Imagens sem sair do sistema', 'Ferramentas', 19.90, false, 15),
  ('messages',     'Recados Internos',     'Comunicação entre membros da equipe', 'Operação',                 0.00,  true,  16),
  ('calendar',     'Calendário',           'Agendamentos e compromissos da equipe', 'Operação',               0.00,  true,  17),
  ('freight_quote','Simulador de Frete',   'Cotação de frete com múltiplas transportadoras', 'Logística',    19.90, false, 18),
  ('credit_check', 'Consulta SCPC/Serasa', 'Análise de crédito de clientes antes da venda', 'Vendas',       29.90, false, 19),
  ('plate_check',  'Consulta de Placa',    'Informações completas de veículos pela placa', 'Operação',      19.90, false, 20),
  ('bin_check',    'Consulta BIN',         'Identificação de cartões de crédito/débito', 'Vendas',          19.90, false, 21),
  ('modules',      'App Store',            'Marketplace de módulos e configurações', 'Gestão',               0.00,  true,  22),
  ('settings',     'Ajustes',              'Configurações gerais do sistema', 'Gestão',                      0.00,  true,  23)
ON CONFLICT (module_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_module_catalog_is_active ON module_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_payment_status ON tenant_modules(payment_status);

INSERT INTO schema_migrations (version) VALUES (4) ON CONFLICT (version) DO NOTHING;
