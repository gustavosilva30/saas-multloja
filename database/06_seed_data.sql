-- ============================================================================
-- NEXUSERP - 06: DADOS INICIAIS (SEEDS)
-- ============================================================================
-- Execute este arquivo SEXTO (opcional) para criar dados de exemplo
-- Use apenas em ambiente de desenvolvimento!
-- ============================================================================

-- ============================================================================
-- 1. CRIAR TENANT DE EXEMPLO
-- ============================================================================

INSERT INTO public.tenants (id, name, document, phone, email, niche, subscription_tier)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Loja Exemplo LTDA',
  '12.345.678/0001-99',
  '(11) 98765-4321',
  'contato@lojaexemplo.com',
  'varejo',
  'pro'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. CRIAR CATEGORIAS DE EXEMPLO
-- ============================================================================

INSERT INTO public.categories (tenant_id, name, description, color) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Eletrônicos', 'Produtos eletrônicos e acessórios', '#3B82F6'),
('550e8400-e29b-41d4-a716-446655440000', 'Vestuário', 'Roupas e acessórios de moda', '#EC4899'),
('550e8400-e29b-41d4-a716-446655440000', 'Alimentos', 'Produtos alimentícios e bebidas', '#10B981'),
('550e8400-e29b-41d4-a716-446655440000', 'Casa e Decoração', 'Itens para casa e decoração', '#F59E0B')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. CRIAR PRODUTOS DE EXEMPLO
-- ============================================================================

WITH cats AS (
  SELECT id, name FROM public.categories 
  WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
)
INSERT INTO public.products (tenant_id, sku, name, description, category_id, cost_price, sale_price, stock_quantity, min_stock)
SELECT 
  '550e8400-e29b-41d4-a716-446655440000',
  sku,
  name,
  description,
  cats.id,
  cost_price,
  sale_price,
  stock,
  min_stock
FROM (VALUES
  ('ELE-001', 'Fone de Ouvido Bluetooth', 'Fone sem fio com alta qualidade de som', 'Eletrônicos', 50.00, 120.00, 50, 10),
  ('ELE-002', 'Carregador USB-C', 'Carregador rápido 20W', 'Eletrônicos', 25.00, 59.90, 100, 20),
  ('VES-001', 'Camiseta Básica', 'Camiseta 100% algodão', 'Vestuário', 20.00, 49.90, 200, 30),
  ('VES-002', 'Calça Jeans', 'Jeans slim fit', 'Vestuário', 60.00, 149.90, 80, 15),
  ('ALI-001', 'Café Premium', 'Café torrado e moído 500g', 'Alimentos', 15.00, 34.90, 150, 25),
  ('CAS-001', 'Abajur LED', 'Luminária de mesa moderna', 'Casa e Decoração', 40.00, 89.90, 30, 5)
) AS t(sku, name, description, cat_name, cost_price, sale_price, stock, min_stock)
JOIN cats ON cats.name = t.cat_name
ON CONFLICT (tenant_id, sku) DO NOTHING;

-- ============================================================================
-- 4. CRIAR CLIENTES DE EXEMPLO
-- ============================================================================

INSERT INTO public.customers (tenant_id, name, document, email, phone, credit_limit) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'João Silva', '123.456.789-00', 'joao@email.com', '(11) 91234-5678', 1000.00),
('550e8400-e29b-41d4-a716-446655440000', 'Maria Santos', '987.654.321-00', 'maria@email.com', '(11) 92345-6789', 2000.00),
('550e8400-e29b-41d4-a716-446655440000', 'Empresa ABC LTDA', '98.765.432/0001-10', 'contato@abc.com', '(11) 3333-4444', 5000.00)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. CRIAR CONTA BANCÁRIA DE EXEMPLO
-- ============================================================================

INSERT INTO public.bank_accounts (tenant_id, name, bank_code, agency, account_number, account_type, initial_balance, current_balance)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Conta Principal',
  '001',
  '1234',
  '56789-0',
  'checking',
  5000.00,
  5000.00
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FIM DO ARQUIVO 06_seed_data.sql
-- ============================================================================
