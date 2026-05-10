import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken, authorize, tenantIsolation } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);
router.use(tenantIsolation);

// ── GET / — listar bundles do tenant ─────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT spb.*,
              sp.name AS service_name, sp.sale_price AS service_price,
              p.name  AS product_name, p.sku         AS product_sku,
              p.sale_price AS product_price
         FROM service_product_bundles spb
         JOIN products sp ON sp.id = spb.service_product_id
         JOIN products p  ON p.id  = spb.product_id
        WHERE spb.tenant_id = $1
        ORDER BY sp.name, p.name`,
      [req.user!.tenant_id]
    );
    res.json({ bundles: result.rows });
  } catch (err) {
    console.error('List bundles error:', err);
    res.status(500).json({ error: 'Failed to list bundles' });
  }
});

// ── GET /by-service/:serviceProductId — kits de um serviço ───────────────────
router.get('/by-service/:serviceProductId',
  param('serviceProductId').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const result = await query(
        `SELECT spb.*, p.name AS product_name, p.sku, p.sale_price
           FROM service_product_bundles spb
           JOIN products p ON p.id = spb.product_id
          WHERE spb.tenant_id = $1
            AND spb.service_product_id = $2
            AND spb.is_active = true
          ORDER BY p.name`,
        [req.user!.tenant_id, req.params.serviceProductId]
      );
      res.json({ bundles: result.rows });
    } catch (err) {
      console.error('Bundle by service error:', err);
      res.status(500).json({ error: 'Failed to get bundles' });
    }
  }
);

// ── POST / — criar bundle ─────────────────────────────────────────────────────
router.post('/',
  authorize('owner', 'admin', 'operator'),
  [
    body('service_product_id').isUUID(),
    body('product_id').isUUID(),
    body('default_quantity').isFloat({ gt: 0 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const { service_product_id, product_id, default_quantity } = req.body;
      const tenantId = req.user!.tenant_id;

      // Verifica que ambos os produtos pertencem ao tenant
      const prodCheck = await query(
        `SELECT id FROM products
          WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
        [tenantId, [service_product_id, product_id]]
      );
      if (prodCheck.rows.length < 2) {
        res.status(400).json({ error: 'Produto ou serviço não encontrado neste tenant' }); return;
      }

      const result = await query(
        `INSERT INTO service_product_bundles
           (tenant_id, service_product_id, product_id, default_quantity)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, service_product_id, product_id)
           DO UPDATE SET default_quantity = EXCLUDED.default_quantity,
                         is_active = true,
                         updated_at = NOW()
         RETURNING *`,
        [tenantId, service_product_id, product_id, default_quantity]
      );
      res.status(201).json({ bundle: result.rows[0] });
    } catch (err) {
      console.error('Create bundle error:', err);
      res.status(500).json({ error: 'Failed to create bundle' });
    }
  }
);

// ── PUT /:id — atualizar quantidade ──────────────────────────────────────────
router.put('/:id',
  authorize('owner', 'admin', 'operator'),
  [
    param('id').isUUID(),
    body('default_quantity').optional().isFloat({ gt: 0 }),
    body('is_active').optional().isBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const { default_quantity, is_active } = req.body;
      const updates: string[] = [];
      const vals: unknown[] = [];
      let i = 1;

      if (default_quantity !== undefined) { updates.push(`default_quantity = $${i++}`); vals.push(default_quantity); }
      if (is_active !== undefined)        { updates.push(`is_active = $${i++}`);        vals.push(is_active); }
      if (updates.length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }

      vals.push(req.params.id, req.user!.tenant_id);
      const result = await query(
        `UPDATE service_product_bundles
           SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${i} AND tenant_id = $${i + 1}
         RETURNING *`,
        vals
      );
      if (result.rows.length === 0) { res.status(404).json({ error: 'Bundle not found' }); return; }
      res.json({ bundle: result.rows[0] });
    } catch (err) {
      console.error('Update bundle error:', err);
      res.status(500).json({ error: 'Failed to update bundle' });
    }
  }
);

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id',
  authorize('owner', 'admin'),
  param('id').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const result = await query(
        `DELETE FROM service_product_bundles
          WHERE id = $1 AND tenant_id = $2
          RETURNING id`,
        [req.params.id, req.user!.tenant_id]
      );
      if (result.rows.length === 0) { res.status(404).json({ error: 'Bundle not found' }); return; }
      res.json({ ok: true });
    } catch (err) {
      console.error('Delete bundle error:', err);
      res.status(500).json({ error: 'Failed to delete bundle' });
    }
  }
);

export default router;
