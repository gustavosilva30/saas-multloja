import { Router, Request, Response } from 'express';
import { body, query as queryValidator, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken, authorize, tenantIsolation } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);
router.use(tenantIsolation);

const ALL_FIELDS = [
  'name', 'person_type', 'document', 'rg', 'email', 'phone', 'phone2',
  'whatsapp', 'instagram', 'website', 'gender', 'birthday', 'address',
  'notes', 'credit_limit', 'credit_balance', 'rating', 'tags', 'metadata', 'is_active',
];

// ── List ──────────────────────────────────────────────────────────────────────
router.get(
  '/',
  [
    queryValidator('page').optional().isInt({ min: 1 }),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
    queryValidator('search').optional().trim(),
    queryValidator('status').optional().isIn(['active', 'inactive', 'all']),
    queryValidator('tag').optional().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

      const tenantId = req.user!.tenant_id;
      const page  = parseInt(req.query.page  as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      const status = (req.query.status as string) || 'active';
      const tag    = req.query.tag as string;

      const conditions: string[] = ['tenant_id = $1'];
      const params: any[] = [tenantId];

      if (status === 'active')   conditions.push('is_active = true');
      if (status === 'inactive') conditions.push('is_active = false');

      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(name ILIKE $${params.length} OR document ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length} OR whatsapp ILIKE $${params.length})`);
      }

      if (tag) {
        params.push(tag);
        conditions.push(`$${params.length} = ANY(tags)`);
      }

      const where = 'WHERE ' + conditions.join(' AND ');

      const [countRes, rows] = await Promise.all([
        query(`SELECT COUNT(*) FROM customers ${where}`, params),
        query(
          `SELECT id, name, person_type, document, email, phone, whatsapp, birthday, tags, rating, credit_limit, credit_balance, is_active, created_at
           FROM customers ${where} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, offset]
        ),
      ]);

      const total = parseInt(countRes.rows[0].count);
      res.json({ customers: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
      console.error('List customers error:', err);
      res.status(500).json({ error: 'Failed to list customers' });
    }
  }
);

// ── Stats summary ─────────────────────────────────────────────────────────────
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const result = await query(
      `SELECT
         COUNT(*)                                                  AS total,
         COUNT(*) FILTER (WHERE is_active)                        AS active,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_this_month,
         COALESCE(SUM(credit_balance), 0)                         AS total_credit_balance,
         COUNT(*) FILTER (WHERE credit_balance > 0)               AS with_credit
       FROM customers WHERE tenant_id = $1`,
      [tenantId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Customer stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ── Get single ────────────────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user!.tenant_id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Customer not found' }); return; }
    res.json({ customer: result.rows[0] });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

// ── Customer purchase history ─────────────────────────────────────────────────
router.get('/:id/sales', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT s.id, s.created_at, s.total, s.discount, s.payment_method, s.status,
              COUNT(si.id) AS item_count
       FROM sales s
       LEFT JOIN sale_items si ON si.sale_id = s.id
       WHERE s.customer_id = $1 AND s.tenant_id = $2
       GROUP BY s.id ORDER BY s.created_at DESC LIMIT 20`,
      [req.params.id, req.user!.tenant_id]
    );
    const totals = await query(
      `SELECT COALESCE(SUM(total),0) AS lifetime_value, COUNT(*) AS total_orders
       FROM sales WHERE customer_id = $1 AND tenant_id = $2 AND status != 'cancelled'`,
      [req.params.id, req.user!.tenant_id]
    );
    res.json({ sales: result.rows, ...totals.rows[0] });
  } catch (err) {
    console.error('Customer sales error:', err);
    res.status(500).json({ error: 'Failed to get sales' });
  }
});

// ── Create ────────────────────────────────────────────────────────────────────
router.post(
  '/',
  authorize('owner', 'admin', 'operator'),
  [
    body('name').trim().isLength({ min: 2 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('person_type').optional().isIn(['PF', 'PJ']),
    body('rating').optional().isInt({ min: 0, max: 5 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

      const tenantId = req.user!.tenant_id;
      const {
        name, person_type = 'PF', document, rg, email, phone, phone2,
        whatsapp, instagram, website, gender, birthday, address,
        notes, credit_limit = 0, credit_balance = 0, rating = 0, tags = [], metadata = {},
      } = req.body;

      const result = await query(
        `INSERT INTO customers
           (tenant_id, name, person_type, document, rg, email, phone, phone2,
            whatsapp, instagram, website, gender, birthday, address,
            notes, credit_limit, credit_balance, rating, tags, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         RETURNING *`,
        [
          tenantId, name, person_type, document, rg, email, phone, phone2,
          whatsapp, instagram, website, gender, birthday, JSON.stringify(address || {}),
          notes, credit_limit, credit_balance, rating, tags, JSON.stringify(metadata),
        ]
      );

      res.status(201).json({ customer: result.rows[0] });
    } catch (err) {
      console.error('Create customer error:', err);
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }
);

// ── Update ────────────────────────────────────────────────────────────────────
router.put('/:id', authorize('owner', 'admin', 'operator'), async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const existing = await query('SELECT id FROM customers WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    if (existing.rows.length === 0) { res.status(404).json({ error: 'Customer not found' }); return; }

    const updates: string[] = [];
    const values: any[] = [];
    let i = 0;

    for (const field of ALL_FIELDS) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${++i}`);
        const val = req.body[field];
        values.push(field === 'address' || field === 'metadata' ? JSON.stringify(val) : val);
      }
    }

    if (updates.length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }

    values.push(req.params.id);
    const result = await query(
      `UPDATE customers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${++i} RETURNING *`,
      values
    );

    res.json({ customer: result.rows[0] });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// ── Delete (soft) ─────────────────────────────────────────────────────────────
router.delete('/:id', authorize('owner', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'UPDATE customers SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [req.params.id, req.user!.tenant_id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Customer not found' }); return; }
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

export default router;
