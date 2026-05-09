import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/modules — retorna módulos ativos do tenant
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const result = await query(
    'SELECT module_id FROM tenant_modules WHERE tenant_id = $1 AND is_active = true',
    [req.user!.tenant_id]
  );
  res.json({ modules: result.rows.map(r => r.module_id) });
});

// PUT /api/modules — sincroniza lista completa de módulos ativos
router.put('/', async (req: Request, res: Response): Promise<void> => {
  const { modules } = req.body as { modules: string[] };
  if (!Array.isArray(modules)) { res.status(400).json({ error: 'modules must be an array' }); return; }

  const tenantId = req.user!.tenant_id;

  // Desativa todos, depois ativa os enviados
  await query('UPDATE tenant_modules SET is_active = false WHERE tenant_id = $1', [tenantId]);

  if (modules.length > 0) {
    const values = modules.map((m, i) => `($1, $${i + 2}, true, NOW())`).join(', ');
    await query(
      `INSERT INTO tenant_modules (tenant_id, module_id, is_active, activated_at)
       VALUES ${values}
       ON CONFLICT (tenant_id, module_id) DO UPDATE SET is_active = true, activated_at = NOW()`,
      [tenantId, ...modules]
    );
  }

  res.json({ ok: true, modules });
});

export default router;
