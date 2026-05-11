import { PoolClient } from 'pg';
import { query, withTransaction } from '../config/database';

// ── Acerto de Contas ──────────────────────────────────────────────────────────
// Retorna quem deve quanto para quem dentro do período.
// Algoritmo: simplifiedDebtSettlement — garante o mínimo de transferências.
export async function getSettlement(groupId: string, tenantId: string, month: string) {
  // month = 'YYYY-MM'
  const [year, m] = month.split('-');
  const startDate = `${year}-${m}-01`;
  const endDate   = new Date(parseInt(year), parseInt(m), 0).toISOString().slice(0, 10);

  // Busca membros ativos do grupo
  const membersRes = await query(
    `SELECT id, name, income_share, monthly_income FROM family_members
     WHERE group_id = $1 AND tenant_id = $2 AND is_active = true`,
    [groupId, tenantId]
  );
  const members = membersRes.rows;
  
  const totalFamilyIncome = members.reduce((s, m) => s + Number(m.monthly_income), 0);
  const totalIncomeShare = members.reduce((s, m) => s + Number(m.income_share), 0) || 100;

  if (members.length < 2) {
    return { 
      members: members.map(m => ({ ...m, balance: 0, status: 'even' })), 
      settlements: [], 
      total_expenses: 0, 
      total_income: totalFamilyIncome,
      balance_remaining: totalFamilyIncome,
      period: month 
    };
  }

  // Busca despesas do período
  const expRes = await query(
    `SELECT e.id, e.paid_by_member_id, e.amount, e.split_type,
            COALESCE(
              json_agg(s) FILTER (WHERE s.id IS NOT NULL),
              '[]'
            ) AS custom_splits
     FROM family_expenses e
     LEFT JOIN family_expense_splits s ON s.expense_id = e.id
     WHERE e.group_id = $1 AND e.tenant_id = $2
       AND e.expense_date BETWEEN $3 AND $4
     GROUP BY e.id`,
    [groupId, tenantId, startDate, endDate]
  );

  // Saldo de cada membro: positivo = credor, negativo = devedor
  const balance: Record<string, number> = {};
  members.forEach(m => { balance[m.id] = 0; });

  let totalExpenses = 0;

  for (const exp of expRes.rows) {
    const amt = Number(exp.amount);
    totalExpenses += amt;

    // Crédito ao pagador
    balance[exp.paid_by_member_id] = (balance[exp.paid_by_member_id] || 0) + amt;

    // Débito por tipo de split
    if (exp.split_type === 'EQUAL') {
      const share = amt / members.length;
      members.forEach(m => { balance[m.id] -= share; });
    } else if (exp.split_type === 'PROPORTIONAL') {
      members.forEach(m => {
        const pct = Number(m.income_share) / totalIncomeShare;
        balance[m.id] -= amt * pct;
      });
    } else if (exp.split_type === 'CUSTOM') {
      for (const split of exp.custom_splits) {
        balance[split.member_id] = (balance[split.member_id] || 0) - Number(split.amount);
      }
    }
  }

  // Algoritmo de liquidação mínima (greedy)
  const settlements: { from: string; from_name: string; to: string; to_name: string; amount: number }[] = [];
  const debtors  = members.filter(m => balance[m.id] < -0.01).map(m => ({ ...m, bal: balance[m.id] }));
  const creditors = members.filter(m => balance[m.id] > 0.01).map(m => ({ ...m, bal: balance[m.id] }));

  let di = 0, ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const d = debtors[di];
    const c = creditors[ci];
    const transfer = Math.min(-d.bal, c.bal);
    if (transfer > 0.01) {
      const memberFrom = members.find(m => m.id === d.id)!;
      const memberTo   = members.find(m => m.id === c.id)!;
      settlements.push({
        from: d.id, from_name: memberFrom.name,
        to:   c.id, to_name:   memberTo.name,
        amount: Math.round(transfer * 100) / 100,
      });
    }
    d.bal += transfer;
    c.bal -= transfer;
    if (Math.abs(d.bal) < 0.01) di++;
    if (Math.abs(c.bal) < 0.01) ci++;
  }

  const memberBalances = members.map(m => ({
    ...m,
    balance: Math.round(balance[m.id] * 100) / 100,
    status: balance[m.id] > 0.01 ? 'creditor' : balance[m.id] < -0.01 ? 'debtor' : 'even',
  }));

  return { 
    members: memberBalances, 
    settlements, 
    total_expenses: totalExpenses, 
    total_income: totalFamilyIncome,
    balance_remaining: totalFamilyIncome - totalExpenses,
    period: month 
  };
}

// ── Cron: Resumo diário WhatsApp ──────────────────────────────────────────────
export async function sendDailyAgenda(groupId: string, tenantId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const eventsRes = await query(
    `SELECT fe.title, fe.type, fe.event_date, fe.location, fm.name AS member_name
     FROM family_events fe
     LEFT JOIN family_members fm ON fm.id = fe.member_id
     WHERE fe.group_id = $1 AND fe.tenant_id = $2
       AND DATE(fe.event_date) = $3
     ORDER BY fe.event_date`,
    [groupId, tenantId, today]
  );

  const tasksRes = await query(
    `SELECT ft.title, ft.points_reward, fm.name AS assigned_name
     FROM family_tasks ft
     LEFT JOIN family_members fm ON fm.id = ft.assigned_to_member_id
     WHERE ft.group_id = $1 AND ft.tenant_id = $2
       AND ft.due_date = $3 AND ft.status = 'PENDING'`,
    [groupId, tenantId, today]
  );

  if (!eventsRes.rows.length && !tasksRes.rows.length) return;

  const typeEmoji: Record<string, string> = {
    SCHOOL: '🏫', MEDICAL: '🏥', COUPLE: '💑', BIRTHDAY: '🎂', GENERAL: '📅',
  };

  const lines: string[] = [
    `🏠 *Agenda Familiar — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}*\n`,
  ];

  if (eventsRes.rows.length) {
    lines.push('📅 *Compromissos de hoje:*');
    eventsRes.rows.forEach(e => {
      const time = new Date(e.event_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      lines.push(`${typeEmoji[e.type] || '📌'} ${e.title}${e.member_name ? ` (${e.member_name})` : ''}${!e.all_day ? ` — ${time}` : ''}${e.location ? `\n   📍 ${e.location}` : ''}`);
    });
    lines.push('');
  }

  if (tasksRes.rows.length) {
    lines.push('✅ *Tarefas com prazo hoje:*');
    tasksRes.rows.forEach(t => {
      lines.push(`• ${t.title}${t.assigned_name ? ` → ${t.assigned_name}` : ''} (+${t.points_reward}pts)`);
    });
  }

  const message = lines.join('\n');

  // Obter instância WhatsApp e JID do grupo
  const groupRes = await query(
    `SELECT fg.whatsapp_group_id, wi.instance_name
     FROM family_groups fg
     JOIN whatsapp_instances wi ON wi.tenant_id = fg.tenant_id AND wi.status = 'open'
     WHERE fg.id = $1 AND fg.tenant_id = $2
     LIMIT 1`,
    [groupId, tenantId]
  );

  if (!groupRes.rows.length || !groupRes.rows[0].whatsapp_group_id) return;

  const { whatsapp_group_id, instance_name } = groupRes.rows[0];
  const waUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  const waKey = process.env.EVOLUTION_API_KEY || '';

  await fetch(`${waUrl}/message/sendText/${instance_name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: waKey },
    body: JSON.stringify({ number: whatsapp_group_id, text: message }),
  }).catch(() => {});

  // Marca eventos como notificados
  await query(
    `UPDATE family_events SET notified = true
     WHERE group_id = $1 AND tenant_id = $2 AND DATE(event_date) = $3`,
    [groupId, tenantId, today]
  );
}
