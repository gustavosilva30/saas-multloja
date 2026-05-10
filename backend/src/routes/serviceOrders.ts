import { Router, Request, Response } from 'express';
import { body, query as qv, param, validationResult } from 'express-validator';
import { authenticateToken, authorize, tenantIsolation } from '../middleware/auth';
import { query } from '../config/database';
import {
  createOs,
  updateOsStatus,
  getOsDetail,
  updateOs,
  OsStatus,
  OsItemType,
} from '../services/OsService';

const router = Router();
router.use(authenticateToken);
router.use(tenantIsolation);

const VALID_STATUSES: OsStatus[] = [
  'DRAFT', 'PENDING_APPROVAL', 'APPROVED',
  'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELED',
];

const itemValidators = [
  body('items').isArray({ min: 0 }),
  body('items.*.item_type').isIn(['PRODUCT', 'SERVICE'] as OsItemType[]),
  body('items.*.product_id').optional({ nullable: true }).isUUID(),
  body('items.*.technician_id').optional({ nullable: true }).isUUID(),
  body('items.*.description').trim().notEmpty(),
  body('items.*.quantity').isFloat({ gt: 0 }),
  body('items.*.unit_price').isFloat({ min: 0 }),
  body('items.*.discount').optional().isFloat({ min: 0 }),
];

// ── GET / — list ──────────────────────────────────────────────────────────────
router.get(
  '/',
  [
    qv('page').optional().isInt({ min: 1 }),
    qv('limit').optional().isInt({ min: 1, max: 100 }),
    qv('status').optional().isIn(VALID_STATUSES),
    qv('customer_id').optional().isUUID(),
    qv('assignee_id').optional().isUUID(),
    qv('search').optional().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const tenantId = req.user!.tenant_id;
      const page  = parseInt(req.query.page  as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const conditions = ['so.tenant_id = $1'];
      const params: unknown[] = [tenantId];

      const addCond = (sql: string, val: unknown) => {
        params.push(val);
        conditions.push(sql.replace('?', `$${params.length}`));
      };

      if (req.query.status)      addCond('so.status = ?', req.query.status);
      if (req.query.customer_id) addCond('so.customer_id = ?', req.query.customer_id);
      if (req.query.assignee_id) addCond('so.assignee_id = ?', req.query.assignee_id);
      if (req.query.search) {
        const like = `%${req.query.search}%`;
        params.push(like);
        conditions.push(
          `(so.os_number::text ILIKE $${params.length} OR c.name ILIKE $${params.length})`
        );
      }

      const where = 'WHERE ' + conditions.join(' AND ');

      const [countRes, rows] = await Promise.all([
        query(`SELECT COUNT(*) FROM service_orders so LEFT JOIN customers c ON c.id = so.customer_id ${where}`, params),
        query(
          `SELECT so.id, so.os_number, so.status, so.total, so.expected_at,
                  so.created_at, so.updated_at, so.asset_metadata,
                  c.name AS customer_name,
                  u.full_name AS assignee_name
           FROM service_orders so
           LEFT JOIN customers     c ON c.id = so.customer_id
           LEFT JOIN user_profiles u ON u.id = so.assignee_id
           ${where}
           ORDER BY so.created_at DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, offset]
        ),
      ]);

      const total = parseInt(countRes.rows[0].count);
      res.json({
        service_orders: rows.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('List OS error:', err);
      res.status(500).json({ error: 'Failed to list service orders' });
    }
  }
);

// ── GET /stats ────────────────────────────────────────────────────────────────
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const result = await query(
      `SELECT
         COUNT(*)                                                 AS total,
         COUNT(*) FILTER (WHERE status = 'DRAFT')               AS draft,
         COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')         AS in_progress,
         COUNT(*) FILTER (WHERE status = 'WAITING_PARTS')       AS waiting_parts,
         COUNT(*) FILTER (WHERE status = 'COMPLETED')           AS completed,
         COUNT(*) FILTER (WHERE status = 'CANCELED')            AS canceled,
         COALESCE(SUM(total) FILTER (WHERE status = 'COMPLETED'), 0) AS revenue_completed
       FROM service_orders
       WHERE tenant_id = $1`,
      [tenantId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('OS stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', param('id').isUUID(), async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  try {
    const os = await getOsDetail(req.params.id, req.user!.tenant_id);
    if (!os) { res.status(404).json({ error: 'Service order not found' }); return; }
    res.json({ service_order: os });
  } catch (err) {
    console.error('Get OS error:', err);
    res.status(500).json({ error: 'Failed to get service order' });
  }
});

// ── POST / — create ───────────────────────────────────────────────────────────
router.post(
  '/',
  authorize('owner', 'admin', 'operator'),
  [
    body('customer_id').optional({ nullable: true }).isUUID(),
    body('assignee_id').optional({ nullable: true }).isUUID(),
    body('asset_metadata').optional().isObject(),
    body('expected_at').optional({ nullable: true }).isISO8601(),
    body('internal_notes').optional().isString(),
    body('customer_notes').optional().isString(),
    ...itemValidators,
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const os = await createOs(req.user!.tenant_id, req.user!.id, req.body);
      res.status(201).json({ service_order: os });
    } catch (err: any) {
      console.error('Create OS error:', err);
      res.status(err.statusCode ?? 500).json({ error: err.message || 'Failed to create service order' });
    }
  }
);

// ── PUT /:id — update fields ──────────────────────────────────────────────────
router.put(
  '/:id',
  authorize('owner', 'admin', 'operator'),
  [
    param('id').isUUID(),
    body('customer_id').optional({ nullable: true }).isUUID(),
    body('assignee_id').optional({ nullable: true }).isUUID(),
    body('asset_metadata').optional().isObject(),
    body('expected_at').optional({ nullable: true }).isISO8601(),
    body('internal_notes').optional().isString(),
    body('customer_notes').optional().isString(),
    ...itemValidators.map(v => v.optional()),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const os = await updateOs(req.params.id, req.user!.tenant_id, req.body);
      res.json({ service_order: os });
    } catch (err: any) {
      console.error('Update OS error:', err);
      res.status(err.statusCode ?? 500).json({ error: err.message || 'Failed to update service order' });
    }
  }
);

// ── PATCH /:id/status — transition ────────────────────────────────────────────
router.patch(
  '/:id/status',
  authorize('owner', 'admin', 'operator'),
  [
    param('id').isUUID(),
    body('status').isIn(VALID_STATUSES),
    body('note').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const os = await updateOsStatus(
        req.params.id,
        req.user!.tenant_id,
        req.user!.id,
        req.body.status as OsStatus,
        req.body.note
      );
      res.json({ service_order: os });
    } catch (err: any) {
      console.error('Update OS status error:', err);
      res.status(err.statusCode ?? 500).json({ error: err.message || 'Failed to update status' });
    }
  }
);

// ── DELETE /:id — soft cancel ─────────────────────────────────────────────────
router.delete(
  '/:id',
  authorize('owner', 'admin'),
  param('id').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const os = await updateOsStatus(
        req.params.id,
        req.user!.tenant_id,
        req.user!.id,
        'CANCELED',
        'Cancelado pelo usuário'
      );
      res.json({ service_order: os });
    } catch (err: any) {
      console.error('Cancel OS error:', err);
      res.status(err.statusCode ?? 500).json({ error: err.message || 'Failed to cancel service order' });
    }
  }
);

export default router;
