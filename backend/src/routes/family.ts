import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken, tenantIsolation } from '../middleware/auth';
import { query, withTransaction } from '../config/database';
import { getSettlement } from '../services/FamilyService';
import { PoolClient } from 'pg';
import { parseMoney, parseInteger, parseEnum, parseUUID, optionalUUID } from '../utils/validators';
import { assertGroupMember, assertAllGroupMembers } from '../utils/tenantOwnership';

const router = Router();
router.use(authenticateToken, tenantIsolation);

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const tid  = (req: Request) => req.user!.tenant_id;
const gid  = (req: Request) => req.params.groupId;

// Valida que o grupo pertence ao tenant
async function validateGroup(groupId: string, tenantId: string) {
  const r = await query(
    `SELECT id FROM family_groups WHERE id = $1 AND tenant_id = $2`,
    [groupId, tenantId]
  );
  if (!r.rows.length) throw Object.assign(new Error('Grupo não encontrado'), { statusCode: 404 });
}

// ── Groups ────────────────────────────────────────────────────────────────────

router.get('/groups', wrap(async (req, res) => {
  const r = await query(
    `SELECT fg.*,
       COUNT(DISTINCT fm.id) FILTER (WHERE fm.is_active) AS member_count
     FROM family_groups fg
     LEFT JOIN family_members fm ON fm.group_id = fg.id
     WHERE fg.tenant_id = $1
     GROUP BY fg.id ORDER BY fg.created_at`,
    [tid(req)]
  );
  res.json({ groups: r.rows });
}));

router.post('/groups', wrap(async (req, res) => {
  const { name, whatsapp_group_id, avatar_url } = req.body;
  if (!name) return res.status(400).json({ error: 'name obrigatório' });
  const r = await query(
    `INSERT INTO family_groups (tenant_id, name, whatsapp_group_id, avatar_url)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [tid(req), name, whatsapp_group_id ?? null, avatar_url ?? null]
  );
  res.status(201).json({ group: r.rows[0] });
}));

router.put('/groups/:groupId', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));
  const { name, whatsapp_group_id, avatar_url } = req.body;
  const r = await query(
    `UPDATE family_groups SET
       name               = COALESCE($1, name),
       whatsapp_group_id  = COALESCE($2, whatsapp_group_id),
       avatar_url         = COALESCE($3, avatar_url),
       updated_at         = NOW()
     WHERE id = $4 AND tenant_id = $5 RETURNING *`,
    [name, whatsapp_group_id, avatar_url, gid(req), tid(req)]
  );
  res.json({ group: r.rows[0] });
}));

router.delete('/groups/:groupId', wrap(async (req, res) => {
  await query(`DELETE FROM family_groups WHERE id = $1 AND tenant_id = $2`, [gid(req), tid(req)]);
  res.json({ ok: true });
}));

// ── Members ───────────────────────────────────────────────────────────────────

router.get('/groups/:groupId/members', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));
  const r = await query(
    `SELECT id, name, role, avatar_color, avatar_emoji, points, income_share, phone, is_active
     FROM family_members WHERE group_id = $1 AND tenant_id = $2 AND is_active = true ORDER BY role, name`,
    [gid(req), tid(req)]
  );
  res.json({ members: r.rows });
}));

router.post('/groups/:groupId/members', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));
  const ALLOWED_ROLE = ['ADMIN', 'ADULT', 'CHILD'] as const;
  const name = String(req.body.name || '').trim();
  if (!name || name.length > 100) return res.status(400).json({ error: 'name inválido (1-100 caracteres)' });
  const role = parseEnum(req.body.role ?? 'ADULT', ALLOWED_ROLE, 'role');
  const income_share = req.body.income_share == null ? 50 : parseMoney(req.body.income_share, { min: 0, max: 100, field: 'income_share', allowZero: true });
  const avatar_color = req.body.avatar_color ?? '#10b981';
  const avatar_emoji = req.body.avatar_emoji ?? '😊';
  const phone = req.body.phone ?? null;
  const pin_code = req.body.pin_code;
  if (pin_code !== undefined && !/^\d{4,6}$/.test(String(pin_code))) {
    return res.status(400).json({ error: 'pin_code deve ter 4 a 6 dígitos numéricos' });
  }

  let hashedPin: string | null = null;
  if (pin_code) {
    const bcrypt = await import('bcryptjs');
    hashedPin = await bcrypt.hash(String(pin_code), 10);
  }

  const r = await query(
    `INSERT INTO family_members
       (group_id, tenant_id, name, role, pin_code, avatar_color, avatar_emoji, income_share, phone)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, name, role, avatar_color, avatar_emoji, points, income_share, phone`,
    [gid(req), tid(req), name, role, hashedPin, avatar_color, avatar_emoji, income_share, phone]
  );
  res.status(201).json({ member: r.rows[0] });
}));

router.put('/groups/:groupId/members/:memberId', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));
  const ALLOWED_ROLE = ['ADMIN', 'ADULT', 'CHILD'] as const;

  let { name, role, avatar_color, avatar_emoji, income_share, phone } = req.body;
  if (name !== undefined) {
    name = String(name).trim();
    if (!name || name.length > 100) return res.status(400).json({ error: 'name inválido (1-100 caracteres)' });
  }
  if (role !== undefined) role = parseEnum(role, ALLOWED_ROLE, 'role');
  if (income_share !== undefined && income_share !== null) {
    income_share = parseMoney(income_share, { min: 0, max: 100, field: 'income_share', allowZero: true });
  }
  if (phone !== undefined && phone !== null && String(phone).length > 20) {
    return res.status(400).json({ error: 'phone excede 20 caracteres' });
  }

  const r = await query(
    `UPDATE family_members SET
       name         = COALESCE($1, name),
       role         = COALESCE($2, role),
       avatar_color = COALESCE($3, avatar_color),
       avatar_emoji = COALESCE($4, avatar_emoji),
       income_share = COALESCE($5, income_share),
       phone        = COALESCE($6, phone)
     WHERE id = $7 AND group_id = $8 AND tenant_id = $9
     RETURNING id, name, role, avatar_color, avatar_emoji, points, income_share, phone`,
    [name, role, avatar_color, avatar_emoji, income_share, phone, req.params.memberId, gid(req), tid(req)]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Membro não encontrado' });
  res.json({ member: r.rows[0] });
}));

router.delete('/groups/:groupId/members/:memberId', wrap(async (req, res) => {
  await query(
    `UPDATE family_members SET is_active = false WHERE id = $1 AND group_id = $2 AND tenant_id = $3`,
    [req.params.memberId, gid(req), tid(req)]
  );
  res.json({ ok: true });
}));

// ── Expenses ──────────────────────────────────────────────────────────────────

router.get('/groups/:groupId/expenses', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));
  const { month } = req.query as Record<string, string>;
  const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || '30', 10) || 30));

  const conditions = [`e.group_id = $1`, `e.tenant_id = $2`];
  const params: any[] = [gid(req), tid(req)];
  let i = 3;

  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month inválido (use YYYY-MM)' });
    }
    conditions.push(`TO_CHAR(e.expense_date, 'YYYY-MM') = $${i++}`);
    params.push(month);
  }

  const r = await query(
    `SELECT e.*, fm.name AS paid_by_name, fm.avatar_color, fm.avatar_emoji
     FROM family_expenses e
     JOIN family_members fm ON fm.id = e.paid_by_member_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY e.expense_date DESC, e.created_at DESC
     LIMIT $${i}`,
    [...params, limit]
  );
  res.json({ expenses: r.rows });
}));

router.post('/groups/:groupId/expenses', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));

  const ALLOWED_CAT = ['FOOD','HOUSING','TRANSPORT','HEALTH','EDUCATION','LEISURE','GENERAL'] as const;
  const ALLOWED_SPLIT = ['EQUAL','PROPORTIONAL','CUSTOM'] as const;

  const paid_by_member_id = parseUUID(req.body.paid_by_member_id, 'paid_by_member_id');
  const amount      = parseMoney(req.body.amount, { field: 'amount' });
  const description = String(req.body.description || '').trim();
  if (!description) return res.status(400).json({ error: 'description obrigatório' });
  if (description.length > 255) return res.status(400).json({ error: 'description excede 255 caracteres' });

  const category   = parseEnum(req.body.category   ?? 'GENERAL', ALLOWED_CAT, 'category');
  const split_type = parseEnum(req.body.split_type ?? 'EQUAL',   ALLOWED_SPLIT, 'split_type');
  const expense_date = req.body.expense_date || new Date().toISOString().slice(0, 10);
  const receipt_url  = req.body.receipt_url ?? null;
  const custom_splits = Array.isArray(req.body.custom_splits) ? req.body.custom_splits : [];

  // 🔒 C2: valida que paid_by_member_id pertence ao grupo + tenant
  await assertGroupMember(paid_by_member_id, gid(req), tid(req), 'pagador');

  // 🔒 C2: se CUSTOM, valida que todos os member_ids do split pertencem ao grupo
  let validatedSplits: Array<{ member_id: string; amount: number }> = [];
  if (split_type === 'CUSTOM') {
    if (!custom_splits.length) {
      return res.status(400).json({ error: 'custom_splits obrigatório para split CUSTOM' });
    }
    validatedSplits = custom_splits.map((s: any, i: number) => ({
      member_id: parseUUID(s.member_id, `custom_splits[${i}].member_id`),
      amount:    parseMoney(s.amount,    { field: `custom_splits[${i}].amount` }),
    }));

    const sum = validatedSplits.reduce((acc, s) => acc + s.amount, 0);
    if (Math.abs(sum - amount) > 0.01) {
      return res.status(400).json({ error: `Soma dos splits (${sum.toFixed(2)}) difere do amount (${amount.toFixed(2)})` });
    }
    await assertAllGroupMembers(validatedSplits.map(s => s.member_id), gid(req), tid(req));
  }

  let expense: any;
  await withTransaction(async (client: PoolClient) => {
    const r = await client.query(
      `INSERT INTO family_expenses
         (group_id, tenant_id, paid_by_member_id, amount, description, category, split_type, expense_date, receipt_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [gid(req), tid(req), paid_by_member_id, amount, description, category, split_type,
       expense_date, receipt_url]
    );
    expense = r.rows[0];

    for (const s of validatedSplits) {
      await client.query(
        `INSERT INTO family_expense_splits (expense_id, member_id, amount) VALUES ($1,$2,$3)`,
        [expense.id, s.member_id, s.amount]
      );
    }
  });

  res.status(201).json({ expense });
}));

router.delete('/groups/:groupId/expenses/:expenseId', wrap(async (req, res) => {
  await query(
    `DELETE FROM family_expenses WHERE id = $1 AND group_id = $2 AND tenant_id = $3`,
    [req.params.expenseId, gid(req), tid(req)]
  );
  res.json({ ok: true });
}));

// ── Settlement ────────────────────────────────────────────────────────────────

router.get('/groups/:groupId/settlement', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const result = await getSettlement(gid(req), tid(req), month);
  res.json(result);
}));

// ── Goals ─────────────────────────────────────────────────────────────────────

router.get('/groups/:groupId/goals', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));
  const r = await query(
    `SELECT * FROM family_goals WHERE group_id = $1 AND tenant_id = $2 AND status != 'CANCELLED' ORDER BY created_at`,
    [gid(req), tid(req)]
  );
  res.json({ goals: r.rows });
}));

router.post('/groups/:groupId/goals', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));
  const title = String(req.body.title || '').trim();
  if (!title || title.length > 150) return res.status(400).json({ error: 'title inválido (1-150 caracteres)' });
  const target_amount = parseMoney(req.body.target_amount, { field: 'target_amount', max: 99_999_999.99 });
  const description = req.body.description ?? null;
  const target_date = req.body.target_date ?? null;
  const emoji = req.body.emoji ?? '🎯';
  const color = req.body.color ?? '#10b981';
  const r = await query(
    `INSERT INTO family_goals (group_id, tenant_id, title, description, target_amount, target_date, emoji, color)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [gid(req), tid(req), title, description, target_amount, target_date, emoji, color]
  );
  res.status(201).json({ goal: r.rows[0] });
}));

router.patch('/groups/:groupId/goals/:goalId/contribute', wrap(async (req, res) => {
  const amount = parseMoney(req.body.amount, { field: 'amount' });
  const r = await query(
    `UPDATE family_goals
     SET current_amount = LEAST(current_amount + $1, target_amount),
         status = CASE WHEN current_amount + $1 >= target_amount THEN 'COMPLETED' ELSE status END,
         updated_at = NOW()
     WHERE id = $2 AND group_id = $3 AND tenant_id = $4 AND status = 'ACTIVE'
     RETURNING *`,
    [amount, req.params.goalId, gid(req), tid(req)]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Meta não encontrada' });
  res.json({ goal: r.rows[0] });
}));

router.delete('/groups/:groupId/goals/:goalId', wrap(async (req, res) => {
  await query(
    `UPDATE family_goals SET status = 'CANCELLED' WHERE id = $1 AND group_id = $2 AND tenant_id = $3`,
    [req.params.goalId, gid(req), tid(req)]
  );
  res.json({ ok: true });
}));

// ── Tasks ─────────────────────────────────────────────────────────────────────

router.get('/groups/:groupId/tasks', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));
  const { status } = req.query as Record<string, string>;
  const ALLOWED_STATUS = ['PENDING', 'DONE', 'CANCELLED'];
  const params: any[] = [gid(req), tid(req)];
  let statusFilter = "AND ft.status != 'CANCELLED'";
  if (status && ALLOWED_STATUS.includes(status)) {
    statusFilter = `AND ft.status = $3`;
    params.push(status);
  }
  const r = await query(
    `SELECT ft.*, am.name AS assigned_name, am.avatar_emoji, am.avatar_color, am.role AS assigned_role
     FROM family_tasks ft
     LEFT JOIN family_members am ON am.id = ft.assigned_to_member_id
     WHERE ft.group_id = $1 AND ft.tenant_id = $2 ${statusFilter}
     ORDER BY ft.due_date NULLS LAST, ft.created_at DESC`,
    params
  );
  res.json({ tasks: r.rows });
}));

router.post('/groups/:groupId/tasks', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));
  const title = String(req.body.title || '').trim();
  if (!title || title.length > 200) return res.status(400).json({ error: 'title inválido (1-200 caracteres)' });

  const points_reward = parseInteger(req.body.points_reward ?? 10, { min: 1, max: 500, field: 'points_reward' });
  const recurrent = Boolean(req.body.recurrent);
  const recurrent_days = recurrent
    ? parseInteger(req.body.recurrent_days ?? 7, { min: 1, max: 365, field: 'recurrent_days' })
    : null;

  const assigned_to_member_id = optionalUUID(req.body.assigned_to_member_id, 'assigned_to_member_id');
  const created_by_member_id  = optionalUUID(req.body.created_by_member_id,  'created_by_member_id');

  // 🔒 valida cross-group dos membros referenciados
  if (assigned_to_member_id) await assertGroupMember(assigned_to_member_id, gid(req), tid(req), 'membro atribuído');
  if (created_by_member_id) {
    await assertGroupMember(created_by_member_id, gid(req), tid(req), 'criador');
    const creator = await query(`SELECT role FROM family_members WHERE id = $1`, [created_by_member_id]);
    if (creator.rows[0]?.role === 'CHILD') {
      return res.status(403).json({ error: 'CHILD não pode criar tarefas' });
    }
  }

  const r = await query(
    `INSERT INTO family_tasks
       (group_id, tenant_id, assigned_to_member_id, created_by_member_id,
        title, description, points_reward, due_date, recurrent, recurrent_days)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [gid(req), tid(req), assigned_to_member_id ?? null, created_by_member_id ?? null,
     title, req.body.description ?? null, points_reward, req.body.due_date ?? null, recurrent, recurrent_days]
  );
  res.status(201).json({ task: r.rows[0] });
}));

router.patch('/groups/:groupId/tasks/:taskId/complete', wrap(async (req, res) => {
  const { member_id } = req.body;
  if (!member_id) return res.status(400).json({ error: 'member_id obrigatório' });

  await withTransaction(async (client: PoolClient) => {
    // Busca a tarefa
    const taskRes = await client.query(
      `SELECT * FROM family_tasks WHERE id = $1 AND group_id = $2 AND tenant_id = $3 AND status = 'PENDING'
       FOR UPDATE`,
      [req.params.taskId, gid(req), tid(req)]
    );
    if (!taskRes.rows.length) throw Object.assign(new Error('Tarefa não encontrada ou já concluída'), { statusCode: 404 });
    const task = taskRes.rows[0];

    // Qualquer membro pode concluir a tarefa atribuída a si, ADMIN/ADULT podem concluir qualquer uma
    const memberRes = await client.query(
      `SELECT role FROM family_members WHERE id = $1 AND group_id = $2 AND is_active = true`,
      [member_id, gid(req)]
    );
    const member = memberRes.rows[0];
    if (!member) throw Object.assign(new Error('Membro não encontrado'), { statusCode: 404 });
    if (member.role === 'CHILD' && task.assigned_to_member_id !== member_id) {
      throw Object.assign(new Error('CHILD só pode concluir tarefas atribuídas a si'), { statusCode: 403 });
    }

    // Marca como concluída
    await client.query(
      `UPDATE family_tasks SET status = 'DONE', completed_at = NOW() WHERE id = $1`,
      [task.id]
    );

    // Adiciona pontos ao membro
    await client.query(
      `UPDATE family_members SET points = points + $1 WHERE id = $2`,
      [task.points_reward, member_id]
    );

    // Se recorrente, cria a próxima ocorrência
    if (task.recurrent && task.recurrent_days && task.due_date) {
      const nextDue = new Date(task.due_date);
      nextDue.setDate(nextDue.getDate() + task.recurrent_days);
      await client.query(
        `INSERT INTO family_tasks
           (group_id, tenant_id, assigned_to_member_id, created_by_member_id,
            title, description, points_reward, due_date, recurrent, recurrent_days)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [gid(req), tid(req), task.assigned_to_member_id, task.created_by_member_id,
         task.title, task.description, task.points_reward,
         nextDue.toISOString().slice(0, 10), true, task.recurrent_days]
      );
    }
  });

  res.json({ ok: true });
}));

router.delete('/groups/:groupId/tasks/:taskId', wrap(async (req, res) => {
  await query(
    `UPDATE family_tasks SET status = 'CANCELLED' WHERE id = $1 AND group_id = $2 AND tenant_id = $3`,
    [req.params.taskId, gid(req), tid(req)]
  );
  res.json({ ok: true });
}));

// ── Events ────────────────────────────────────────────────────────────────────

router.get('/groups/:groupId/events', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));
  const { start, end } = req.query as Record<string, string>;
  const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;
  const params: any[] = [gid(req), tid(req)];
  const filters: string[] = [];
  if (start && ISO.test(start)) { params.push(start); filters.push(`AND fe.event_date >= $${params.length}`); }
  if (end   && ISO.test(end))   { params.push(end);   filters.push(`AND fe.event_date <= $${params.length}`); }
  const r = await query(
    `SELECT fe.*, fm.name AS member_name, fm.avatar_emoji
     FROM family_events fe
     LEFT JOIN family_members fm ON fm.id = fe.member_id
     WHERE fe.group_id = $1 AND fe.tenant_id = $2 ${filters.join(' ')}
     ORDER BY fe.event_date`,
    params
  );
  res.json({ events: r.rows });
}));

router.post('/groups/:groupId/events', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));
  const { title, description, event_date, end_date, type = 'GENERAL', all_day, location, color, member_id } = req.body;
  if (!title || !event_date) return res.status(400).json({ error: 'title e event_date obrigatórios' });
  const r = await query(
    `INSERT INTO family_events
       (group_id, tenant_id, member_id, title, description, event_date, end_date, type, all_day, location, color)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [gid(req), tid(req), member_id ?? null, title, description ?? null, event_date,
     end_date ?? null, type, all_day ?? false, location ?? null, color ?? null]
  );
  res.status(201).json({ event: r.rows[0] });
}));

router.put('/groups/:groupId/events/:eventId', wrap(async (req, res) => {
  const { title, description, event_date, end_date, type, all_day, location, color, member_id } = req.body;
  const r = await query(
    `UPDATE family_events SET
       title       = COALESCE($1, title),
       description = COALESCE($2, description),
       event_date  = COALESCE($3, event_date),
       end_date    = COALESCE($4, end_date),
       type        = COALESCE($5, type),
       all_day     = COALESCE($6, all_day),
       location    = COALESCE($7, location),
       color       = COALESCE($8, color),
       member_id   = COALESCE($9, member_id)
     WHERE id = $10 AND group_id = $11 AND tenant_id = $12 RETURNING *`,
    [title, description, event_date, end_date, type, all_day, location, color, member_id,
     req.params.eventId, gid(req), tid(req)]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json({ event: r.rows[0] });
}));

router.delete('/groups/:groupId/events/:eventId', wrap(async (req, res) => {
  await query(
    `DELETE FROM family_events WHERE id = $1 AND group_id = $2 AND tenant_id = $3`,
    [req.params.eventId, gid(req), tid(req)]
  );
  res.json({ ok: true });
}));

// ── Dashboard (tudo em 1 request) ─────────────────────────────────────────────
router.get('/groups/:groupId/dashboard', wrap(async (req, res) => {
  await validateGroup(gid(req), tid(req));

  const today     = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const weekEnd   = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [membersRes, goalsRes, tasksRes, eventsRes, settlementRes] = await Promise.all([
    query(`SELECT id, name, role, avatar_color, avatar_emoji, points FROM family_members
           WHERE group_id = $1 AND tenant_id = $2 AND is_active = true ORDER BY points DESC`,
      [gid(req), tid(req)]),
    query(`SELECT * FROM family_goals WHERE group_id = $1 AND tenant_id = $2 AND status = 'ACTIVE' ORDER BY created_at`,
      [gid(req), tid(req)]),
    query(`SELECT ft.*, am.name AS assigned_name, am.avatar_emoji
           FROM family_tasks ft LEFT JOIN family_members am ON am.id = ft.assigned_to_member_id
           WHERE ft.group_id = $1 AND ft.tenant_id = $2 AND ft.status = 'PENDING'
             AND (ft.due_date IS NULL OR ft.due_date <= $3)
           ORDER BY ft.due_date NULLS LAST LIMIT 5`,
      [gid(req), tid(req), weekEnd]),
    query(`SELECT fe.*, fm.name AS member_name, fm.avatar_emoji AS member_emoji
           FROM family_events fe LEFT JOIN family_members fm ON fm.id = fe.member_id
           WHERE fe.group_id = $1 AND fe.tenant_id = $2 AND DATE(fe.event_date) >= $3
           ORDER BY fe.event_date LIMIT 5`,
      [gid(req), tid(req), today]),
    getSettlement(gid(req), tid(req), thisMonth),
  ]);

  res.json({
    members: membersRes.rows,
    goals: goalsRes.rows,
    pending_tasks: tasksRes.rows,
    upcoming_events: eventsRes.rows,
    settlement: settlementRes,
  });
}));

export default router;
