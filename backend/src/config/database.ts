import { Pool, PoolClient } from 'pg';
import { AsyncLocalStorage } from 'async_hooks';
import dotenv from 'dotenv';

dotenv.config();

// =============================================================================
// 🔒 C4 / Fase 2 — Separação de credenciais por finalidade
// =============================================================================
// • DATABASE_URL_APP        — usado pelo POOL principal (role: app_runtime)
//                             SEM BYPASSRLS → as policies de RLS são impostas.
// • DATABASE_URL_MIGRATOR   — usado APENAS pelo runMigrations() no boot
//                             (role: migrator) com BYPASSRLS para DDL/seed.
// • DATABASE_URL (fallback) — compatibilidade durante a migração. Se as duas
//                             específicas não estiverem setadas, usamos esta
//                             para AMBOS os pools — comportamento legado.
//                             EM PRODUÇÃO, defina as duas separadas.
// =============================================================================

const APP_URL      = process.env.DATABASE_URL_APP      || process.env.DATABASE_URL;
const MIGRATOR_URL = process.env.DATABASE_URL_MIGRATOR || process.env.DATABASE_URL;

if (!APP_URL) {
  throw new Error('DATABASE_URL_APP (ou DATABASE_URL fallback) é obrigatório');
}
if (!MIGRATOR_URL) {
  throw new Error('DATABASE_URL_MIGRATOR (ou DATABASE_URL fallback) é obrigatório');
}

// Aviso caso esteja rodando com fallback em produção (configuração insegura).
if (process.env.NODE_ENV === 'production'
    && (!process.env.DATABASE_URL_APP || !process.env.DATABASE_URL_MIGRATOR)) {
  console.warn(
    '⚠️  ATENÇÃO: rodando em produção SEM separação de roles. ' +
    'Defina DATABASE_URL_APP e DATABASE_URL_MIGRATOR para ativar o RLS de verdade.'
  );
}

// ── Pool principal — role app_runtime (sofre RLS) ────────────────────────────
export const pool = new Pool({
  connectionString: APP_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ App pool connected to PostgreSQL');
});

pool.on('error', (err: Error) => {
  console.error('❌ App pool error:', err);
});

// ── Pool de migração — role migrator (BYPASSRLS) ─────────────────────────────
// Pool separado e MENOR — usado só por runMigrations() no boot. Não fica
// disponível ao runtime para evitar uso acidental que bypassaria RLS.
const migratorPool = new Pool({
  connectionString: MIGRATOR_URL,
  max: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

migratorPool.on('error', (err: Error) => {
  console.error('❌ Migrator pool error:', err);
});

// Auto-migration: creates missing tables on startup
export async function runMigrations(): Promise<void> {
  const client = await migratorPool.connect();
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

        ('whatsapp_integration',  'WhatsApp Business',         'Envio automático de notificações, OS e cobranças via WhatsApp',   'Integração',  59.90, false, 23),
        ('family_hub',            'Gestão Familiar',           'Hub completo para casais e famílias: finanças, tarefas, metas e agenda', 'Pessoal', 24.90, false, 24)
      ON CONFLICT (module_id) DO NOTHING
    `);

    // Garante módulos adicionados após seed inicial (upsert por nome para não perder preço customizado)
    await client.query(`
      INSERT INTO module_catalog (module_id, name, description, category, price, is_free, sort_order)
      VALUES
        ('whatsapp_integration', 'WhatsApp Business', 'Envio automático de notificações, OS e cobranças via WhatsApp', 'Integração', 59.90, false, 23),
        ('family_hub', 'Gestão Familiar', 'Hub completo para casais e famílias: finanças, tarefas, metas e agenda', 'Pessoal', 24.90, false, 24)
      ON CONFLICT (module_id) DO UPDATE SET
        name        = EXCLUDED.name,
        description = EXCLUDED.description,
        category    = EXCLUDED.category,
        sort_order  = EXCLUDED.sort_order
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_module_catalog_is_active ON module_catalog(is_active)
    `);

    // ── Niche templates ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS niche_templates (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name        VARCHAR(100) NOT NULL,
        slug        VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        form_schema JSONB NOT NULL DEFAULT '[]',
        is_active   BOOLEAN NOT NULL DEFAULT true,
        sort_order  INTEGER DEFAULT 0,
        created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_niche_templates_slug ON niche_templates(slug)
    `);

    // Add niche_id FK to tenants (may already exist — IF NOT EXISTS handles it)
    await client.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS niche_template_id UUID REFERENCES niche_templates(id) ON DELETE SET NULL
    `);

    // Ensure products.metadata JSONB column exists
    await client.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'
    `);

    // Seed: default niche templates
    await client.query(`
      INSERT INTO niche_templates (name, slug, description, form_schema, sort_order) VALUES
      ('Auto Peças', 'auto_pecas', 'Lojas de peças automotivas e acessórios', '[
        {"name":"codigo_oem","label":"Código OEM","type":"text","required":false},
        {"name":"marca_veiculo","label":"Marca do Veículo","type":"text","required":false},
        {"name":"modelo_veiculo","label":"Modelo do Veículo","type":"text","required":false},
        {"name":"ano_inicial","label":"Ano Inicial","type":"number","required":false},
        {"name":"ano_final","label":"Ano Final","type":"number","required":false},
        {"name":"posicao_montagem","label":"Posição de Montagem","type":"text","required":false}
      ]'::jsonb, 1),
      ('Barbearia / Salão', 'barbearia', 'Serviços de corte, barba e estética', '[
        {"name":"tempo_estimado","label":"Tempo Estimado (min)","type":"number","required":false},
        {"name":"tipo_servico","label":"Tipo de Serviço","type":"select","options":["Corte","Barba","Sobrancelha","Coloração","Manicure"],"required":false},
        {"name":"profissional","label":"Profissional Responsável","type":"text","required":false}
      ]'::jsonb, 2),
      ('Vestuário', 'vestuario', 'Roupas, calçados e acessórios de moda', '[
        {"name":"tamanho","label":"Tamanho","type":"select","options":["PP","P","M","G","GG","XGG"],"required":false},
        {"name":"cor","label":"Cor","type":"text","required":false},
        {"name":"material","label":"Material / Tecido","type":"text","required":false},
        {"name":"genero","label":"Gênero","type":"select","options":["Masculino","Feminino","Unissex","Infantil"],"required":false}
      ]'::jsonb, 3),
      ('Restaurante / Lanchonete', 'restaurante', 'Alimentação, delivery e cardápio digital', '[
        {"name":"ingredientes","label":"Ingredientes","type":"textarea","required":false},
        {"name":"calorias","label":"Calorias (kcal)","type":"number","required":false},
        {"name":"alergenos","label":"Alérgenos","type":"text","required":false},
        {"name":"tempo_preparo","label":"Tempo de Preparo (min)","type":"number","required":false},
        {"name":"vegano","label":"Vegano","type":"select","options":["Sim","Não"],"required":false}
      ]'::jsonb, 4),
      ('Farmácia / Saúde', 'farmacia', 'Medicamentos, cosméticos e suplementos', '[
        {"name":"principio_ativo","label":"Princípio Ativo","type":"text","required":false},
        {"name":"dosagem","label":"Dosagem","type":"text","required":false},
        {"name":"laboratorio","label":"Laboratório","type":"text","required":false},
        {"name":"registro_anvisa","label":"Registro ANVISA","type":"text","required":false},
        {"name":"requer_receita","label":"Requer Receita","type":"select","options":["Sim","Não"],"required":false}
      ]'::jsonb, 5),
      ('Varejo Geral', 'varejo_geral', 'Lojas de produtos variados sem campo específico', '[]'::jsonb, 6)
      ON CONFLICT (slug) DO NOTHING
    `);

    console.log('✅ Database migrations applied');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    client.release();
    // Drena o pool do migrator — não queremos manter conexões com BYPASSRLS
    // ociosas em runtime. Próximas migrations (deploys futuros) abrem novas.
    await migratorPool.end().catch(() => { /* ignore */ });
  }
}

export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>();

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    const context = tenantContext.getStore();
    if (context?.tenantId) {
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [context.tenantId]);
    }
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
  const context = tenantContext.getStore();
  console.log('[DB Query] Context:', context?.tenantId, 'Query:', text.trim().substring(0, 50));
  if (context?.tenantId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [context.tenantId]);
      const res = await client.query(text, params);
      await client.query('COMMIT');
      return res;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  return pool.query(text, params);
}

export default pool;
