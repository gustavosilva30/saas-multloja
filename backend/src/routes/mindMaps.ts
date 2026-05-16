import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken, tenantIsolation } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();
router.use(authenticateToken, tenantIsolation);

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const tid = (req: Request) => req.user!.tenant_id;
const uid = (req: Request) => req.user!.id;

const EMPTY_DATA = { nodes: [], edges: [] };

// List maps
router.get('/', wrap(async (req, res) => {
  const r = await query(
    `SELECT id, title, description, template, owner_id, created_at, updated_at,
            jsonb_array_length(COALESCE(data->'nodes','[]'::jsonb)) AS node_count
       FROM mind_maps
      WHERE tenant_id = $1
      ORDER BY updated_at DESC`,
    [tid(req)]
  );
  res.json({ maps: r.rows });
}));

// Get single map (full data)
router.get('/:id([0-9a-fA-F-]{36})', wrap(async (req, res) => {
  const r = await query(
    `SELECT * FROM mind_maps WHERE id = $1 AND tenant_id = $2`,
    [req.params.id, tid(req)]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Mapa não encontrado' });
  res.json({ map: r.rows[0] });
}));

// Create
router.post('/', wrap(async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title obrigatório' });
  const description = req.body.description ?? null;
  const template = req.body.template ?? null;
  const data = req.body.data ?? EMPTY_DATA;

  const r = await query(
    `INSERT INTO mind_maps (tenant_id, owner_id, title, description, template, data)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [tid(req), uid(req), title.slice(0, 200), description, template, data]
  );
  res.status(201).json({ map: r.rows[0] });
}));

// Update (autosave canvas + meta)
router.put('/:id([0-9a-fA-F-]{36})', wrap(async (req, res) => {
  const { title, description, template, data } = req.body;
  const r = await query(
    `UPDATE mind_maps SET
        title       = COALESCE($1, title),
        description = COALESCE($2, description),
        template    = COALESCE($3, template),
        data        = COALESCE($4, data),
        updated_at  = NOW()
      WHERE id = $5 AND tenant_id = $6
      RETURNING *`,
    [title ?? null, description ?? null, template ?? null, data ?? null, req.params.id, tid(req)]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Mapa não encontrado' });
  res.json({ map: r.rows[0] });
}));

// Delete
router.delete('/:id([0-9a-fA-F-]{36})', wrap(async (req, res) => {
  await query(`DELETE FROM mind_maps WHERE id = $1 AND tenant_id = $2`, [req.params.id, tid(req)]);
  res.json({ ok: true });
}));

// Save snapshot version
router.post('/:id/versions', wrap(async (req, res) => {
  const m = await query(
    `SELECT data FROM mind_maps WHERE id = $1 AND tenant_id = $2`,
    [req.params.id, tid(req)]
  );
  if (!m.rows.length) return res.status(404).json({ error: 'Mapa não encontrado' });
  const r = await query(
    `INSERT INTO mind_map_versions (map_id, tenant_id, snapshot, created_by)
     VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
    [req.params.id, tid(req), m.rows[0].data, uid(req)]
  );
  res.status(201).json({ version: r.rows[0] });
}));

// ── Data sources catalog ───────────────────────────────────────────────────
const DATA_SOURCES = [
  { key: 'sales.revenue_30d',       label: 'Receita (30 dias)',         format: 'currency', category: 'Vendas',     trend: true  },
  { key: 'sales.revenue_today',     label: 'Receita de hoje',           format: 'currency', category: 'Vendas',     trend: false },
  { key: 'sales.count_30d',         label: 'Vendas (30 dias)',          format: 'number',   category: 'Vendas',     trend: false },
  { key: 'sales.avg_ticket_30d',    label: 'Ticket médio (30d)',        format: 'currency', category: 'Vendas',     trend: false },
  { key: 'customers.total',         label: 'Total de clientes',         format: 'number',   category: 'Clientes',   trend: false },
  { key: 'customers.new_30d',       label: 'Novos clientes (30d)',      format: 'number',   category: 'Clientes',   trend: false },
  { key: 'products.low_stock',      label: 'Produtos com estoque baixo',format: 'number',   category: 'Estoque',    trend: false },
  { key: 'products.out_of_stock',   label: 'Produtos esgotados',        format: 'number',   category: 'Estoque',    trend: false },
  { key: 'products.stock_value',    label: 'Valor do estoque',          format: 'currency', category: 'Estoque',    trend: false },
  { key: 'finance.income_month',    label: 'Receita do mês',            format: 'currency', category: 'Financeiro', trend: false },
  { key: 'finance.expense_month',   label: 'Despesa do mês',            format: 'currency', category: 'Financeiro', trend: false },
  { key: 'finance.balance_month',   label: 'Resultado do mês',          format: 'currency', category: 'Financeiro', trend: false },
  { key: 'finance.overdue_amount',  label: 'Total em atraso',           format: 'currency', category: 'Financeiro', trend: false },
  { key: 'service_orders.open',     label: 'OS em andamento',           format: 'number',   category: 'Serviços',   trend: false },
  { key: 'service_orders.done_30d', label: 'OS concluídas (30d)',       format: 'number',   category: 'Serviços',   trend: false },
];

router.get('/meta/data-sources', wrap(async (_req, res) => {
  res.json({ sources: DATA_SOURCES });
}));

async function resolveBinding(key: string, tenantId: string): Promise<{ value: number; trend?: number[] } | null> {
  switch (key) {
    case 'sales.revenue_30d': {
      const r = await query(
        `SELECT COALESCE(SUM(total - COALESCE(discount,0)),0)::float8 AS v
           FROM sales WHERE tenant_id = $1 AND status='completed'
            AND created_at >= NOW() - INTERVAL '30 days'`, [tenantId]);
      const t = await query(
        `SELECT COALESCE(SUM(total - COALESCE(discount,0)),0)::float8 AS v
           FROM sales WHERE tenant_id = $1 AND status='completed'
            AND created_at >= NOW() - INTERVAL '7 days'
          GROUP BY date_trunc('day', created_at)
          ORDER BY date_trunc('day', created_at)`, [tenantId]);
      return { value: r.rows[0].v, trend: t.rows.map(x => x.v) };
    }
    case 'sales.revenue_today': {
      const r = await query(
        `SELECT COALESCE(SUM(total - COALESCE(discount,0)),0)::float8 AS v
           FROM sales WHERE tenant_id = $1 AND status='completed'
            AND created_at >= date_trunc('day', NOW())`, [tenantId]);
      return { value: r.rows[0].v };
    }
    case 'sales.count_30d': {
      const r = await query(
        `SELECT COUNT(*)::int AS v FROM sales WHERE tenant_id = $1 AND status='completed'
           AND created_at >= NOW() - INTERVAL '30 days'`, [tenantId]);
      return { value: r.rows[0].v };
    }
    case 'sales.avg_ticket_30d': {
      const r = await query(
        `SELECT COALESCE(AVG(total - COALESCE(discount,0)),0)::float8 AS v
           FROM sales WHERE tenant_id = $1 AND status='completed'
            AND created_at >= NOW() - INTERVAL '30 days'`, [tenantId]);
      return { value: r.rows[0].v };
    }
    case 'customers.total': {
      const r = await query(`SELECT COUNT(*)::int AS v FROM customers WHERE tenant_id = $1`, [tenantId]);
      return { value: r.rows[0].v };
    }
    case 'customers.new_30d': {
      const r = await query(
        `SELECT COUNT(*)::int AS v FROM customers WHERE tenant_id = $1
           AND created_at >= NOW() - INTERVAL '30 days'`, [tenantId]);
      return { value: r.rows[0].v };
    }
    case 'products.low_stock': {
      const r = await query(
        `SELECT COUNT(*)::int AS v FROM products
          WHERE tenant_id = $1 AND is_active = true
            AND stock_quantity > 0 AND stock_quantity <= COALESCE(min_stock,0)`, [tenantId]);
      return { value: r.rows[0].v };
    }
    case 'products.out_of_stock': {
      const r = await query(
        `SELECT COUNT(*)::int AS v FROM products
          WHERE tenant_id = $1 AND is_active = true AND stock_quantity = 0`, [tenantId]);
      return { value: r.rows[0].v };
    }
    case 'products.stock_value': {
      const r = await query(
        `SELECT COALESCE(SUM(stock_quantity * COALESCE(cost_price,0)),0)::float8 AS v
           FROM products WHERE tenant_id = $1 AND is_active = true`, [tenantId]);
      return { value: r.rows[0].v };
    }
    case 'finance.income_month': {
      const r = await query(
        `SELECT COALESCE(SUM(amount),0)::float8 AS v FROM financial_transactions
          WHERE tenant_id = $1 AND type='income' AND status != 'cancelled'
            AND due_date >= date_trunc('month', NOW())
            AND due_date <  date_trunc('month', NOW()) + INTERVAL '1 month'`, [tenantId]);
      return { value: r.rows[0].v };
    }
    case 'finance.expense_month': {
      const r = await query(
        `SELECT COALESCE(SUM(amount),0)::float8 AS v FROM financial_transactions
          WHERE tenant_id = $1 AND type='expense' AND status != 'cancelled'
            AND due_date >= date_trunc('month', NOW())
            AND due_date <  date_trunc('month', NOW()) + INTERVAL '1 month'`, [tenantId]);
      return { value: r.rows[0].v };
    }
    case 'finance.balance_month': {
      const r = await query(
        `SELECT
           COALESCE(SUM(amount) FILTER (WHERE type='income'),0)::float8 -
           COALESCE(SUM(amount) FILTER (WHERE type='expense'),0)::float8 AS v
           FROM financial_transactions
          WHERE tenant_id = $1 AND status != 'cancelled'
            AND due_date >= date_trunc('month', NOW())
            AND due_date <  date_trunc('month', NOW()) + INTERVAL '1 month'`, [tenantId]);
      return { value: r.rows[0].v };
    }
    case 'finance.overdue_amount': {
      const r = await query(
        `SELECT COALESCE(SUM(amount),0)::float8 AS v FROM financial_transactions
          WHERE tenant_id = $1 AND status='pending' AND due_date < NOW()`, [tenantId]);
      return { value: r.rows[0].v };
    }
    case 'service_orders.open': {
      const r = await query(
        `SELECT COUNT(*)::int AS v FROM service_orders
          WHERE tenant_id = $1 AND status NOT IN ('COMPLETED','CANCELED')`, [tenantId]);
      return { value: r.rows[0].v };
    }
    case 'service_orders.done_30d': {
      const r = await query(
        `SELECT COUNT(*)::int AS v FROM service_orders
          WHERE tenant_id = $1 AND status = 'COMPLETED'
            AND created_at >= NOW() - INTERVAL '30 days'`, [tenantId]);
      return { value: r.rows[0].v };
    }
    default:
      return null;
  }
}

router.post('/meta/resolve', wrap(async (req, res) => {
  const keys: string[] = Array.isArray(req.body.keys) ? req.body.keys.slice(0, 50) : [];
  const result: Record<string, { value: number; trend?: number[] } | { error: string }> = {};
  for (const key of keys) {
    try {
      const r = await resolveBinding(key, tid(req));
      result[key] = r ?? { error: 'unknown_key' };
    } catch (e: any) {
      result[key] = { error: e?.message ?? 'query_failed' };
    }
  }
  res.json({ resolved: result, resolved_at: new Date().toISOString() });
}));

router.get('/:id/versions', wrap(async (req, res) => {
  const r = await query(
    `SELECT id, created_at, created_by FROM mind_map_versions
      WHERE map_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 50`,
    [req.params.id, tid(req)]
  );
  res.json({ versions: r.rows });
}));

export default router;
