import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticateToken, tenantIsolation } from '../middleware/auth';
import { query, withTransaction } from '../config/database';
import {
  seedChartOfAccounts,
  getDRE,
  getCashFlow,
  getAccountBalances,
  createTransaction,
  payTransaction,
  parseOfx,
  importOfxTransactions,
  TransactionInput,
} from '../services/FinanceService';
import { parseMoney, parseInteger, parseEnum, parseISODate, parseUUID, optionalUUID } from '../utils/validators';
import { assertTenantOwnership } from '../utils/tenantOwnership';

const router = Router();
router.use(authenticateToken, tenantIsolation);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const tid = (req: Request) => req.user!.tenant_id;

// ── Bank Accounts ─────────────────────────────────────────────────────────────

router.get('/bank-accounts', wrap(async (req, res) => {
  const rows = await getAccountBalances(tid(req));
  res.json({ accounts: rows });
}));

router.post('/bank-accounts', wrap(async (req, res) => {
  const ALLOWED = ['CHECKING','SAVINGS','CASH','INVESTMENT'] as const;
  const name = String(req.body.name || '').trim();
  if (!name || name.length > 100) return res.status(400).json({ error: 'name inválido (1-100 caracteres)' });
  const type  = parseEnum(req.body.type ?? 'CHECKING', ALLOWED, 'type');
  const color = req.body.color ?? '#10b981';
  // initial_balance pode ser negativo (overdraft)
  const initial_balance = req.body.initial_balance == null
    ? 0
    : parseMoney(req.body.initial_balance, { min: -9_999_999.99, max: 99_999_999.99, field: 'initial_balance', allowZero: true });
  const r = await query(
    `INSERT INTO bank_accounts (tenant_id, name, type, color, bank_name, description, initial_balance)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [tid(req), name, type, color, req.body.bank_name ?? null, req.body.description ?? null, initial_balance]
  );
  res.status(201).json({ account: r.rows[0] });
}));

router.put('/bank-accounts/:id', wrap(async (req, res) => {
  const ALLOWED = ['CHECKING','SAVINGS','CASH','INVESTMENT'] as const;
  const { name, color, bank_name, description } = req.body;
  const type = req.body.type ? parseEnum(req.body.type, ALLOWED, 'type') : undefined;
  const initial_balance = req.body.initial_balance == null
    ? undefined
    : parseMoney(req.body.initial_balance, { min: -9_999_999.99, max: 99_999_999.99, field: 'initial_balance', allowZero: true });
  if (name !== undefined && (!String(name).trim() || String(name).length > 100)) {
    return res.status(400).json({ error: 'name inválido (1-100 caracteres)' });
  }
  const r = await query(
    `UPDATE bank_accounts SET
       name            = COALESCE($1, name),
       type            = COALESCE($2, type),
       color           = COALESCE($3, color),
       bank_name       = COALESCE($4, bank_name),
       description     = COALESCE($5, description),
       initial_balance = COALESCE($6, initial_balance),
       updated_at      = NOW()
     WHERE id = $7 AND tenant_id = $8 RETURNING *`,
    [name, type, color, bank_name, description, initial_balance, req.params.id, tid(req)]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Conta não encontrada' });
  res.json({ account: r.rows[0] });
}));

router.delete('/bank-accounts/:id', wrap(async (req, res) => {
  await query(
    `UPDATE bank_accounts SET is_active = false WHERE id = $1 AND tenant_id = $2`,
    [req.params.id, tid(req)]
  );
  res.json({ ok: true });
}));

// ── Chart of Accounts ─────────────────────────────────────────────────────────

router.get('/chart-of-accounts', wrap(async (req, res) => {
  const r = await query(
    `SELECT coa.*, parent.name AS parent_name
     FROM chart_of_accounts coa
     LEFT JOIN chart_of_accounts parent ON parent.id = coa.parent_id
     WHERE coa.tenant_id = $1 AND coa.is_active = true
     ORDER BY coa.code`,
    [tid(req)]
  );
  if (!r.rows.length) {
    await seedChartOfAccounts(tid(req));
    return res.json({ accounts: (await query(
      `SELECT * FROM chart_of_accounts WHERE tenant_id = $1 AND is_active = true ORDER BY code`,
      [tid(req)]
    )).rows });
  }
  res.json({ accounts: r.rows });
}));

router.post('/chart-of-accounts', wrap(async (req, res) => {
  const { name, code, type, parent_id } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name e type obrigatórios' });
  const r = await query(
    `INSERT INTO chart_of_accounts (tenant_id, name, code, type, parent_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [tid(req), name, code ?? null, type, parent_id ?? null]
  );
  res.status(201).json({ account: r.rows[0] });
}));

router.delete('/chart-of-accounts/:id', wrap(async (req, res) => {
  await query(
    `UPDATE chart_of_accounts SET is_active = false WHERE id = $1 AND tenant_id = $2`,
    [req.params.id, tid(req)]
  );
  res.json({ ok: true });
}));

// ── Cost Centers ──────────────────────────────────────────────────────────────

router.get('/cost-centers', wrap(async (req, res) => {
  const r = await query(
    `SELECT * FROM cost_centers WHERE tenant_id = $1 AND is_active = true ORDER BY name`,
    [tid(req)]
  );
  res.json({ cost_centers: r.rows });
}));

router.post('/cost-centers', wrap(async (req, res) => {
  const { name, code, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name obrigatório' });
  const r = await query(
    `INSERT INTO cost_centers (tenant_id, name, code, description) VALUES ($1,$2,$3,$4) RETURNING *`,
    [tid(req), name, code ?? null, description ?? null]
  );
  res.status(201).json({ cost_center: r.rows[0] });
}));

router.delete('/cost-centers/:id', wrap(async (req, res) => {
  await query(
    `UPDATE cost_centers SET is_active = false WHERE id = $1 AND tenant_id = $2`,
    [req.params.id, tid(req)]
  );
  res.json({ ok: true });
}));

// ── Transactions ──────────────────────────────────────────────────────────────

router.get('/transactions', wrap(async (req, res) => {
  const {
    type, status, start_date, end_date,
    bank_account_id, chart_of_account_id,
    page = '1', limit = '50',
  } = req.query as Record<string, string>;

  const conditions: string[] = ['ft.tenant_id = $1'];
  const params: any[] = [tid(req)];
  let i = 2;

  if (type)               { conditions.push(`ft.type = $${i++}`);                params.push(type); }
  if (status)             { conditions.push(`ft.status = $${i++}`);              params.push(status); }
  if (bank_account_id)    { conditions.push(`ft.bank_account_id = $${i++}`);     params.push(bank_account_id); }
  if (chart_of_account_id){ conditions.push(`ft.chart_of_account_id = $${i++}`); params.push(chart_of_account_id); }
  if (start_date)         { conditions.push(`ft.due_date >= $${i++}`);           params.push(start_date); }
  if (end_date)           { conditions.push(`ft.due_date <= $${i++}`);           params.push(end_date); }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = conditions.join(' AND ');

  const [rows, cnt] = await Promise.all([
    query(
      `SELECT ft.*,
              ba.name  AS bank_account_name,
              coa.name AS chart_of_account_name,
              cc.name  AS cost_center_name
       FROM financial_transactions ft
       LEFT JOIN bank_accounts    ba  ON ba.id  = ft.bank_account_id
       LEFT JOIN chart_of_accounts coa ON coa.id = ft.chart_of_account_id
       LEFT JOIN cost_centers     cc  ON cc.id  = ft.cost_center_id
       WHERE ${where} AND ft.status != 'cancelled'
       ORDER BY ft.due_date DESC, ft.created_at DESC
       LIMIT $${i} OFFSET $${i+1}`,
      [...params, parseInt(limit), offset]
    ),
    query(`SELECT COUNT(*) FROM financial_transactions ft WHERE ${where} AND ft.status != 'cancelled'`, params),
  ]);

  res.json({
    transactions: rows.rows,
    total: parseInt(cnt.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
  });
}));

router.post('/transactions', wrap(async (req, res) => {
  const ALLOWED_TYPE   = ['income', 'expense'] as const;
  const ALLOWED_STATUS = ['pending', 'paid', 'cancelled'] as const;

  const type        = parseEnum(req.body.type, ALLOWED_TYPE, 'type');
  const description = String(req.body.description || '').trim();
  if (!description) return res.status(400).json({ error: 'description obrigatório' });
  if (description.length > 255) return res.status(400).json({ error: 'description excede 255 caracteres' });

  const amount   = parseMoney(req.body.amount,   { field: 'amount' });
  const due_date = parseISODate(req.body.due_date, 'due_date');
  const status   = req.body.status ? parseEnum(req.body.status, ALLOWED_STATUS, 'status') : 'pending';
  const installments = parseInteger(req.body.installments ?? 1, { min: 1, max: 60, field: 'installments' });
  const recurrent = Boolean(req.body.recurrent);
  const recurrent_months = recurrent
    ? parseInteger(req.body.recurrent_months ?? 12, { min: 1, max: 60, field: 'recurrent_months' })
    : undefined;

  const bank_account_id     = optionalUUID(req.body.bank_account_id,     'bank_account_id');
  const chart_of_account_id = optionalUUID(req.body.chart_of_account_id, 'chart_of_account_id');
  const cost_center_id      = optionalUUID(req.body.cost_center_id,      'cost_center_id');
  const contact_id          = optionalUUID(req.body.contact_id,          'contact_id');

  // 🔒 C3: valida que cada FK pertence ao tenant
  if (bank_account_id)     await assertTenantOwnership('bank_accounts',    bank_account_id,     tid(req), 'bank_account', 'AND is_active = true');
  if (chart_of_account_id) await assertTenantOwnership('chart_of_accounts', chart_of_account_id, tid(req), 'chart_of_account');
  if (cost_center_id)      await assertTenantOwnership('cost_centers',      cost_center_id,      tid(req), 'cost_center');
  if (contact_id)          await assertTenantOwnership('customers',         contact_id,          tid(req), 'contact');

  const data: TransactionInput = {
    type, description, amount, due_date, status,
    installments, recurrent, recurrent_months,
    bank_account_id, chart_of_account_id, cost_center_id, contact_id,
    competence_date: req.body.competence_date,
    payment_date:    req.body.payment_date,
    tags:    Array.isArray(req.body.tags) ? req.body.tags.slice(0, 20).map(String) : [],
    category: req.body.category,
  };

  const created = await createTransaction(tid(req), data);
  res.status(201).json({ transactions: created, count: created.length });
}));

router.get('/transactions/:id', wrap(async (req, res) => {
  const r = await query(
    `SELECT ft.*, ba.name AS bank_account_name, coa.name AS chart_of_account_name
     FROM financial_transactions ft
     LEFT JOIN bank_accounts ba ON ba.id = ft.bank_account_id
     LEFT JOIN chart_of_accounts coa ON coa.id = ft.chart_of_account_id
     WHERE ft.id = $1 AND ft.tenant_id = $2`,
    [req.params.id, tid(req)]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Transação não encontrada' });
  res.json({ transaction: r.rows[0] });
}));

router.put('/transactions/:id', wrap(async (req, res) => {
  // 🔒 C3: cada FK editável precisa ser validada cross-tenant antes do UPDATE
  const fkChecks: Array<[string, string, string, string?]> = [
    ['bank_account_id',     'bank_accounts',    'bank_account',     'AND is_active = true'],
    ['chart_of_account_id', 'chart_of_accounts','chart_of_account'],
    ['cost_center_id',      'cost_centers',     'cost_center'],
    ['contact_id',          'customers',        'contact'],
  ];
  for (const [field, table, label, extra] of fkChecks) {
    if (req.body[field] !== undefined && req.body[field] !== null) {
      const id = parseUUID(req.body[field], field);
      await assertTenantOwnership(table, id, tid(req), label, extra ?? '');
      req.body[field] = id;
    }
  }

  // Validações monetárias e de tipo
  if (req.body.amount !== undefined) req.body.amount = parseMoney(req.body.amount, { field: 'amount' });
  if (req.body.due_date !== undefined) req.body.due_date = parseISODate(req.body.due_date, 'due_date');
  if (req.body.competence_date !== undefined && req.body.competence_date !== null) {
    req.body.competence_date = parseISODate(req.body.competence_date, 'competence_date');
  }
  if (req.body.description !== undefined) {
    const d = String(req.body.description).trim();
    if (!d || d.length > 255) return res.status(400).json({ error: 'description inválido' });
    req.body.description = d;
  }
  if (req.body.tags !== undefined && !Array.isArray(req.body.tags)) {
    return res.status(400).json({ error: 'tags deve ser array' });
  }

  const allowed = ['description', 'amount', 'due_date', 'competence_date',
                   'bank_account_id', 'chart_of_account_id', 'cost_center_id',
                   'contact_id', 'tags', 'category', 'attachment_url'];
  const sets: string[] = [];
  const params: any[] = [];
  let i = 1;
  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      sets.push(`${field} = $${i++}`);
      params.push(req.body[field]);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  params.push(req.params.id, tid(req));
  const r = await query(
    `UPDATE financial_transactions SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${i} AND tenant_id = $${i+1} AND status != 'paid' RETURNING *`,
    params
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Transação não encontrada ou já paga' });
  res.json({ transaction: r.rows[0] });
}));

router.delete('/transactions/:id', wrap(async (req, res) => {
  const r = await query(
    `UPDATE financial_transactions SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND status != 'paid' RETURNING id`,
    [req.params.id, tid(req)]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Transação não encontrada ou já paga' });
  res.json({ ok: true });
}));

router.patch('/transactions/:id/pay', wrap(async (req, res) => {
  const payment_date   = parseISODate(req.body.payment_date, 'payment_date');
  const bank_account_id = optionalUUID(req.body.bank_account_id, 'bank_account_id');

  // 🔒 C3: valida que a conta bancária pertence ao tenant antes de gravá-la
  if (bank_account_id) {
    await assertTenantOwnership('bank_accounts', bank_account_id, tid(req), 'bank_account', 'AND is_active = true');
  }

  const tx = await payTransaction(req.params.id, tid(req), payment_date, bank_account_id);
  res.json({ transaction: tx });
}));

// ── Reports ───────────────────────────────────────────────────────────────────

router.get('/reports/dre', wrap(async (req, res) => {
  const start_date = parseISODate(req.query.start_date, 'start_date');
  const end_date   = parseISODate(req.query.end_date,   'end_date');
  const dre = await getDRE(tid(req), start_date, end_date);
  res.json(dre);
}));

router.get('/reports/cash-flow', wrap(async (req, res) => {
  const raw = parseInt((req.query.months as string) || '12', 10) || 12;
  const months = Math.min(60, Math.max(1, raw));
  const rows = await getCashFlow(tid(req), months);
  res.json({ cash_flow: rows });
}));

router.get('/reports/summary', wrap(async (req, res) => {
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [balances, monthly, overdue] = await Promise.all([
    getAccountBalances(tid(req)),
    query(
      `SELECT
         SUM(CASE WHEN type = 'income'  AND status != 'cancelled' THEN amount ELSE 0 END)::NUMERIC(12,2) AS total_income,
         SUM(CASE WHEN type = 'expense' AND status != 'cancelled' THEN amount ELSE 0 END)::NUMERIC(12,2) AS total_expense,
         SUM(CASE WHEN type = 'income'  AND status = 'paid'       THEN amount ELSE 0 END)::NUMERIC(12,2) AS received,
         SUM(CASE WHEN type = 'expense' AND status = 'paid'       THEN amount ELSE 0 END)::NUMERIC(12,2) AS paid
       FROM financial_transactions
       WHERE tenant_id = $1 AND due_date BETWEEN $2 AND $3`,
      [tid(req), firstDay, lastDay]
    ),
    query(
      `SELECT COUNT(*) AS count, SUM(amount)::NUMERIC(12,2) AS total
       FROM financial_transactions
       WHERE tenant_id = $1 AND status = 'pending' AND due_date < NOW()`,
      [tid(req)]
    ),
  ]);

  const totalBalance = balances.reduce((s: number, a: any) => s + Number(a.current_balance), 0);

  res.json({
    total_balance: totalBalance,
    accounts: balances,
    month: monthly.rows[0],
    overdue: overdue.rows[0],
    period: { start: firstDay, end: lastDay },
  });
}));

// ── OFX Import ────────────────────────────────────────────────────────────────

router.post('/bank-accounts/:id/import-ofx', upload.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo OFX obrigatório' });

  // Validate bank account belongs to tenant
  const baRes = await query(
    `SELECT id FROM bank_accounts WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
    [req.params.id, tid(req)]
  );
  if (!baRes.rows.length) return res.status(404).json({ error: 'Conta bancária não encontrada' });

  const ofxText = req.file.buffer.toString('latin1'); // OFX often in ISO-8859-1
  const txns = parseOfx(ofxText);
  if (!txns.length) return res.status(400).json({ error: 'Nenhuma transação encontrada no arquivo OFX' });

  const result = await importOfxTransactions(tid(req), req.params.id, txns);
  res.json({ ...result, total_parsed: txns.length });
}));

// ── Billing Rules ─────────────────────────────────────────────────────────────

router.get('/billing-rules', wrap(async (req, res) => {
  const r = await query(
    `SELECT * FROM billing_rules WHERE tenant_id = $1 ORDER BY days_offset`,
    [tid(req)]
  );
  res.json({ rules: r.rows });
}));

router.post('/billing-rules', wrap(async (req, res) => {
  const { name, days_offset, channel = 'whatsapp', message_template } = req.body;
  if (!name || days_offset === undefined || !message_template) {
    return res.status(400).json({ error: 'name, days_offset e message_template obrigatórios' });
  }
  const r = await query(
    `INSERT INTO billing_rules (tenant_id, name, days_offset, channel, message_template)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [tid(req), name, days_offset, channel, message_template]
  );
  res.status(201).json({ rule: r.rows[0] });
}));

router.put('/billing-rules/:id', wrap(async (req, res) => {
  const { name, days_offset, channel, message_template, is_active } = req.body;
  const r = await query(
    `UPDATE billing_rules SET
       name             = COALESCE($1, name),
       days_offset      = COALESCE($2, days_offset),
       channel          = COALESCE($3, channel),
       message_template = COALESCE($4, message_template),
       is_active        = COALESCE($5, is_active),
       updated_at       = NOW()
     WHERE id = $6 AND tenant_id = $7 RETURNING *`,
    [name, days_offset, channel, message_template, is_active, req.params.id, tid(req)]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Régua não encontrada' });
  res.json({ rule: r.rows[0] });
}));

router.delete('/billing-rules/:id', wrap(async (req, res) => {
  await query(
    `DELETE FROM billing_rules WHERE id = $1 AND tenant_id = $2`,
    [req.params.id, tid(req)]
  );
  res.json({ ok: true });
}));

export default router;
