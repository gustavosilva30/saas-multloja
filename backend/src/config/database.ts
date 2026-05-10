import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err: Error) => {
  console.error('❌ PostgreSQL error:', err);
});

// Auto-migration: creates missing tables on startup
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_admins (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_modules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        module_id VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, module_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant_id ON tenant_modules(tenant_id)
    `);

    // Add payment columns to tenant_modules if they don't exist yet
    await client.query(`
      ALTER TABLE tenant_modules
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'free',
        ADD COLUMN IF NOT EXISTS asaas_payment_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE
    `);

    // Module catalog table
    await client.query(`
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
      )
    `);

    // Seed module catalog (only inserts missing rows)
    await client.query(`
      INSERT INTO module_catalog (module_id, name, description, category, price, is_free, sort_order) VALUES
        ('dashboard',    'Dashboard',                 'Visão geral do negócio com métricas em tempo real',                  'Gestão',      0.00,  true,  1),
        ('pos',          'Frente de Caixa (PDV)',     'Venda rápida no balcão com leitor de código de barras',              'Vendas',      0.00,  true,  2),
        ('stock',        'Gestão de Estoque',         'Controle de SKUs, categorias e alertas de estoque baixo',            'Operação',    0.00,  true,  3),
        ('customers',    'CRM de Clientes',           'Histórico de compras, aniversários e carteira por vendedor',         'Vendas',      0.00,  true,  4),
        ('finance',      'Financeiro Avançado',       'Contas a pagar/receber, DRE, fluxo de caixa',                       'Gestão',      49.90, false, 5),
        ('services',     'Ordens de Serviço',         'Ideal para oficinas e assistência técnica',                          'Operação',    49.90, false, 6),
        ('catalog',      'Catálogo Técnico',          'Vinculação de produtos a aplicações (veículos, máquinas)',           'Operação',    29.90, false, 7),
        ('events',       'Gestão de Eventos',         'Criação de eventos, ingressos e check-in via QR Code',              'Atendimento', 39.90, false, 8),
        ('automations',  'Automações',                'Integração via Webhooks (n8n, Zapier) baseada em eventos',          'Integração',  59.90, false, 9),
        ('ai_assistant', 'Assistente Financeiro IA',  'Lançamento de despesas por áudio/texto nativo',                     'Avançado',    79.90, false, 10),
        ('ecommerce',    'Integração E-commerce',     'Conecta seu estoque com Nuvemshop, Shopify e Mercado Livre',        'Integração',  69.90, false, 11),
        ('marketing',    'Marketing SMS/Email',       'Automações de recuperação de clientes e promoções',                 'Marketing',   49.90, false, 12),
        ('delivery',     'App de Entregadores',       'Roteirização e aplicativo exclusivo para motoboys',                 'Logística',   59.90, false, 13),
        ('image_editor', 'Editor de Imagens',         'Criação de artes e banners para redes sociais',                     'Marketing',   19.90, false, 14),
        ('messages',     'Recados Internos',          'Comunicação entre membros da equipe',                               'Operação',    0.00,  true,  15),
        ('calendar',     'Calendário',                'Agendamentos e compromissos da equipe',                             'Operação',    0.00,  true,  16),
        ('freight_quote','Simulador de Frete',        'Cotação de frete com múltiplas transportadoras',                   'Logística',   19.90, false, 17),
        ('credit_check', 'Consulta SCPC/Serasa',      'Análise de crédito de clientes antes da venda',                    'Vendas',      29.90, false, 18),
        ('plate_check',  'Consulta de Placa',         'Informações completas de veículos pela placa',                     'Operação',    19.90, false, 19),
        ('bin_check',    'Consulta BIN',              'Identificação de cartões de crédito/débito',                       'Vendas',      19.90, false, 20),
        ('modules',      'App Store',                 'Marketplace de módulos e configurações',                           'Gestão',      0.00,  true,  21),
        ('settings',     'Ajustes',                   'Configurações gerais do sistema',                                  'Gestão',      0.00,  true,  22)
      ON CONFLICT (module_id) DO NOTHING
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_module_catalog_is_active ON module_catalog(is_active)
    `);

    console.log('✅ Database migrations applied');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export default pool;
