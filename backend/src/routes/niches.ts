import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// ── Public (authenticated tenants) ───────────────────────────────────────────

// GET /api/niches — list active niche templates (for registration dropdowns)
router.get('/', authenticateToken, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, slug, description, form_schema, sort_order
       FROM niche_templates WHERE is_active = true ORDER BY sort_order, name`
    );
    res.json({ niches: result.rows });
  } catch (err) {
    console.error('Niches list error:', err);
    res.status(500).json({ error: 'Failed to list niches' });
  }
});

// GET /api/niches/public — no auth needed (for onboarding/registration pages)
router.get('/public', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, slug, description, form_schema, sort_order
       FROM niche_templates WHERE is_active = true ORDER BY sort_order, name`
    );
    res.json({ niches: result.rows });
  } catch (err) {
    console.error('Niches public error:', err);
    res.status(500).json({ error: 'Failed to list niches' });
  }
});

// GET /api/niches/:id/schema — get just the form_schema for a niche
router.get('/:id/schema', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, slug, form_schema FROM niche_templates WHERE id = $1 AND is_active = true`,
      [req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Niche not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Niche schema error:', err);
    res.status(500).json({ error: 'Failed to get niche schema' });
  }
});

export default router;
