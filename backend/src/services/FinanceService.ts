import { PoolClient } from 'pg';
import { query, withTransaction } from '../config/database';

// ── Plano de Contas padrão ────────────────────────────────────────────────────
const DEFAULT_COA = [
  // RECEITAS
  { code: '1',     name: 'Receitas',              type: 'REVENUE',  parent: null },
  { code: '1.1',   name: 'Receitas Operacionais', type: 'REVENUE',  parent: '1' },
  { code: '1.1.1', name: 'Vendas de Produtos',    type: 'REVENUE',  parent: '1.1' },
  { code: '1.1.2', name: 'Serviços Prestados',    type: 'REVENUE',  parent: '1.1' },
  { code: '1.2',   name: 'Receitas Financeiras',  type: 'REVENUE',  parent: '1' },
  // DESPESAS
  { code: '2',     name: 'Despesas',              type: 'EXPENSE',  parent: null },
  { code: '2.1',   name: 'Custo dos Produtos',    type: 'EXPENSE',  parent: '2' },
  { code: '2.2',   name: 'Despesas Operacionais', type: 'EXPENSE',  parent: '2' },
  { code: '2.2.1', name: 'Aluguel',               type: 'EXPENSE',  parent: '2.2' },
  { code: '2.2.2', name: 'Folha de Pagamento',    type: 'EXPENSE',  parent: '2.2' },
  { code: '2.2.3', name: 'Marketing',             type: 'EXPENSE',  parent: '2.2' },
  { code: '2.2.4', name: 'Manutenção',            type: 'EXPENSE',  parent: '2.2' },
  { code: '2.3',   name: 'Despesas Financeiras',  type: 'EXPENSE',  parent: '2' },
  { code: '2.3.1', name: 'Tarifas Bancárias',     type: 'EXPENSE',  parent: '2.3' },
  { code: '2.3.2', name: 'Juros e Multas',        type: 'EXPENSE',  parent: '2.3' },
  // ATIVOS / PASSIVOS
  { code: '3',     name: 'Outros',                type: 'ASSET',    parent: null },
];

export async function seedChartOfAccounts(tenantId: string): Promise<void> {
  await withTransaction(async (client: PoolClient) => {
    const existing = await client.query(
      'SELECT code FROM chart_of_accounts WHERE tenant_id = $1', [tenantId]
    );
    if (existing.rows.length > 0) return; // já tem plano

    const codeToId: Record<string, string> = {};

    for (const item of DEFAULT_COA) {
      const parentId = item.parent ? (codeToId[item.parent] ?? null) : null;
      const res = await client.query(
        `INSERT INTO chart_of_accounts (tenant_id, parent_id, code, name, type)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [tenantId, parentId, item.code, item.name, item.type]
      );
      codeToId[item.code] = res.rows[0].id;
    }
  });
}

// ── DRE — Demonstrativo de Resultado ─────────────────────────────────────────
export async function getDRE(tenantId: string, startDate: string, endDate: string) {
  // Agrupa por conta de resultado (REVENUE / EXPENSE) usando competence_date
  const res = await query(
    `SELECT
       coa.code,
       coa.name,
       coa.type,
       parent.code   AS parent_code,
       parent.name   AS parent_name,
       COALESCE(SUM(
         CASE WHEN ft.type = 'income'  THEN ft.amount
              WHEN ft.type = 'expense' THEN -ft.amount
              ELSE 0 END
       ), 0)::NUMERIC(12,2) AS balance
     FROM chart_of_accounts coa
     LEFT JOIN chart_of_accounts parent ON parent.id = coa.parent_id
     LEFT JOIN financial_transactions ft
            ON ft.chart_of_account_id = coa.id
           AND ft.tenant_id           = $1
           AND ft.status             != 'cancelled'
           AND (ft.competence_date IS NULL OR ft.competence_date BETWEEN $2 AND $3)
    WHERE coa.tenant_id = $1
      AND coa.type IN ('REVENUE','EXPENSE')
    GROUP BY coa.id, coa.code, coa.name, coa.type, parent.code, parent.name
    ORDER BY coa.type DESC, coa.code`,
    [tenantId, startDate, endDate]
  );

  const revenues = res.rows.filter(r => r.type === 'REVENUE');
  const expenses = res.rows.filter(r => r.type === 'EXPENSE');
  const totalRevenue = revenues.reduce((s, r) => s + Number(r.balance), 0);
  const totalExpense = expenses.reduce((s, r) => s + Math.abs(Number(r.balance)), 0);

  return {
    period: { start: startDate, end: endDate },
    revenues,
    expenses,
    total_revenue: totalRevenue,
    total_expense: totalExpense,
    net_result:    totalRevenue - totalExpense,
  };
}

// ── Fluxo de Caixa mensal (12 meses) ─────────────────────────────────────────
export async function getCashFlow(tenantId: string, months = 12) {
  const res = await query(
    `SELECT
       TO_CHAR(due_date, 'YYYY-MM') AS month,
       SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END)::NUMERIC(12,2) AS income,
       SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)::NUMERIC(12,2) AS expense
     FROM financial_transactions
    WHERE tenant_id = $1
      AND status   != 'cancelled'
      AND due_date  > NOW() - INTERVAL '1 year'
    GROUP BY month
    ORDER BY month`,
    [tenantId]
  );
  return res.rows;
}

// ── Saldo consolidado por conta bancária ──────────────────────────────────────
export async function getAccountBalances(tenantId: string) {
  const res = await query(
    `SELECT
       ba.id, ba.name, ba.type, ba.color, ba.bank_name,
       ba.initial_balance,
       COALESCE(SUM(
         CASE WHEN ft.type = 'income'  AND ft.status = 'paid' THEN  ft.amount
              WHEN ft.type = 'expense' AND ft.status = 'paid' THEN -ft.amount
              ELSE 0 END
       ), 0)::NUMERIC(12,2) AS movements,
       (ba.initial_balance + COALESCE(SUM(
         CASE WHEN ft.type = 'income'  AND ft.status = 'paid' THEN  ft.amount
              WHEN ft.type = 'expense' AND ft.status = 'paid' THEN -ft.amount
              ELSE 0 END
       ), 0))::NUMERIC(12,2) AS current_balance
     FROM bank_accounts ba
     LEFT JOIN financial_transactions ft ON ft.bank_account_id = ba.id
    WHERE ba.tenant_id = $1 AND ba.is_active = true
    GROUP BY ba.id
    ORDER BY ba.name`,
    [tenantId]
  );
  return res.rows;
}

// ── Criar transação com suporte a parcelamento ────────────────────────────────
export interface TransactionInput {
  bank_account_id?:     string;
  chart_of_account_id?: string;
  cost_center_id?:      string;
  contact_id?:          string;
  type:                 'income' | 'expense';
  description:          string;
  amount:               number;
  due_date:             string;
  competence_date?:     string;
  status?:              string;
  payment_date?:        string;
  installments?:        number;   // 1 = à vista
  recurrent?:           boolean;
  recurrent_months?:    number;
  tags?:                string[];
  related_sale_id?:     string;
  related_customer_id?: string;
  category?:            string;
}

export async function createTransaction(tenantId: string, data: TransactionInput) {
  const installments = Math.max(1, data.installments ?? 1);
  const created: any[] = [];

  await withTransaction(async (client: PoolClient) => {
    const groupId = installments > 1 || data.recurrent ? crypto.randomUUID() : null;

    const months = data.recurrent ? (data.recurrent_months ?? 12) : installments;

    for (let i = 0; i < months; i++) {
      const dueDate = addMonths(data.due_date, i);
      const competenceDate = data.competence_date ? addMonths(data.competence_date, i) : dueDate;

      const res = await client.query(
        `INSERT INTO financial_transactions
           (tenant_id, bank_account_id, chart_of_account_id, cost_center_id, contact_id,
            type, description, amount, due_date, competence_date, status, payment_date,
            installment_number, installment_total, recurrent_group_id, tags,
            related_sale_id, related_customer_id, category)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [
          tenantId,
          data.bank_account_id      ?? null,
          data.chart_of_account_id  ?? null,
          data.cost_center_id       ?? null,
          data.contact_id           ?? null,
          data.type,
          installments > 1
            ? `${data.description} (${i + 1}/${months})`
            : data.description,
          data.amount / (data.recurrent ? 1 : installments),
          dueDate,
          competenceDate,
          data.status ?? 'pending',
          data.payment_date ?? null,
          i + 1,
          months,
          groupId,
          data.tags ?? [],
          data.related_sale_id      ?? null,
          data.related_customer_id  ?? null,
          data.category             ?? null,
        ]
      );
      created.push(res.rows[0]);
    }
  });

  return created;
}

// ── Baixar (pagar) transação ───────────────────────────────────────────────────
export async function payTransaction(
  id: string,
  tenantId: string,
  paymentDate: string,
  bankAccountId?: string
) {
  const res = await query(
    `UPDATE financial_transactions
       SET status          = 'paid',
           payment_date    = $1,
           bank_account_id = COALESCE($2, bank_account_id),
           updated_at      = NOW()
     WHERE id = $3 AND tenant_id = $4 AND status != 'paid'
     RETURNING *`,
    [paymentDate, bankAccountId ?? null, id, tenantId]
  );
  if (res.rows.length === 0) throw Object.assign(new Error('Transação não encontrada ou já paga'), { statusCode: 404 });
  return res.rows[0];
}

// ── Importar OFX (parser simples de SGML) ────────────────────────────────────
export interface OfxTransaction {
  fitid:  string;
  type:   'CREDIT' | 'DEBIT';
  dtposted: string;
  amount: number;
  memo:   string;
}

export function parseOfx(ofxText: string): OfxTransaction[] {
  const txns: OfxTransaction[] = [];
  const stmttrns = ofxText.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi);

  for (const match of stmttrns) {
    const body  = match[1];
    const get   = (tag: string) => body.match(new RegExp(`<${tag}>([^<\n\r]+)`, 'i'))?.[1]?.trim() ?? '';
    const ttype = get('TRNTYPE').toUpperCase() as 'CREDIT' | 'DEBIT';
    const amt   = parseFloat(get('TRNAMT').replace(',', '.'));
    const dtraw = get('DTPOSTED');           // 20240115120000[-03:EST]
    const dt    = `${dtraw.slice(0,4)}-${dtraw.slice(4,6)}-${dtraw.slice(6,8)}`;

    txns.push({
      fitid:    get('FITID'),
      type:     amt >= 0 ? 'CREDIT' : 'DEBIT',
      dtposted: dt,
      amount:   Math.abs(amt),
      memo:     get('MEMO') || get('NAME'),
    });
  }
  return txns;
}

export async function importOfxTransactions(
  tenantId: string,
  bankAccountId: string,
  txns: OfxTransaction[]
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped  = 0;

  await withTransaction(async (client: PoolClient) => {
    for (const tx of txns) {
      try {
        await client.query(
          `INSERT INTO financial_transactions
             (tenant_id, bank_account_id, type, description, amount, due_date,
              competence_date, payment_date, status, is_conciliated, ofx_transaction_id)
           VALUES ($1, $2, $3, $4, $5, $6, $6, $6, 'paid', true, $7)`,
          [
            tenantId, bankAccountId,
            tx.type === 'CREDIT' ? 'income' : 'expense',
            tx.memo, tx.amount, tx.dtposted, tx.fitid,
          ]
        );
        imported++;
      } catch (err: any) {
        if (err.code === '23505') skipped++; // unique violation = já importado
        else throw err;
      }
    }
  });

  return { imported, skipped };
}

// ── Helper ────────────────────────────────────────────────────────────────────
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
