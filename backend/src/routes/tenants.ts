import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// ── GET /api/tenants/me ────────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const result = await query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    res.json({ tenant: result.rows[0] });
  } catch (err) {
    console.error('Get tenant error:', err);
    res.status(500).json({ error: 'Failed to get tenant settings' });
  }
});

// ── PUT /api/tenants/me ───────────────────────────────────────────────────────
router.put('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Sem permissão para alterar configurações da empresa' });
      return;
    }

    const tenantId = req.user!.tenant_id;
    const { name, phone, email, address, settings } = req.body;

    const result = await query(`
      UPDATE tenants SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        email = COALESCE($3, email),
        address = COALESCE($4, address),
        settings = COALESCE($5, settings),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [name, phone, email, address, settings ? JSON.stringify(settings) : null, tenantId]);

    res.json({ tenant: result.rows[0] });
  } catch (err) {
    console.error('Update tenant error:', err);
    res.status(500).json({ error: 'Failed to update tenant settings' });
  }
});

export default router;