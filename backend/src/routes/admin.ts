import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { config } from '../config';

const router = Router();

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || config.JWT_SECRET + '_admin';

// ── Middleware ────────────────────────────────────────────────────────────────
async function adminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Token required' }); return; }
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { adminId: string };
    const result = await query(
      'SELECT id, email, full_name, is_active FROM platform_admins WHERE id = $1',
      [decoded.adminId]
    );
    if (!result.rows[0] || !result.rows[0].is_active) {
      res.status(401).json({ error: 'Admin not found or disabled' }); return;
    }
    (req as any).admin = result.rows[0];
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// ── POST /api/admin/login ─────────────────────────────────────────────────────
router.post('/login',
  [body('email').isEmail(), body('password').notEmpty()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

      const { email, password } = req.body;
      const result = await query(
        'SELECT id, email, full_name, password_hash, is_active FROM platform_admins WHERE LOWER(email) = LOWER($1)',
        [email]
      );
      const admin = result.rows[0];
      if (!admin || !admin.is_active) { res.status(401).json({ error: 'Invalid credentials' }); return; }

      const valid = await bcrypt.compare(password, admin.password_hash);
      if (!valid) { res.status(401).json({ error: 'Invalid credentials' }); return; }

      await query('UPDATE platform_admins SET last_login_at = NOW() WHERE id = $1', [admin.id]);

      const token = jwt.sign({ adminId: admin.id }, ADMIN_JWT_SECRET, { expiresIn: '8h' });
      res.json({ token, admin: { id: admin.id, email: admin.email, full_name: admin.full_name } });
    } catch (err) {
      console.error('Admin login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ── GET /api/admin/me ─────────────────────────────────────────────────────────
router.get('/me', adminAuth, (req: Request, res: Response) => {
  res.json({ admin: (req as any).admin });
});

// ── GET /api/admin/tenants ────────────────────────────────────────────────────
router.get('/tenants', adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT
        t.id, t.name, t.niche, t.subscription_tier, t.is_active, t.created_at,
        COUNT(DISTINCT u.id)::int AS user_count,
        COUNT(DISTINCT tm.module_id)::int AS active_module_count,
        MAX(u.last_login_at) AS last_activity
      FROM tenants t
      LEFT JOIN user_profiles u ON u.tenant_id = t.id
      LEFT JOIN tenant_modules tm ON tm.tenant_id = t.id AND tm.is_active = true
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    res.json({ tenants: result.rows });
  } catch (err) {
    console.error('Admin tenants error:', err);
    res.status(500).json({ error: 'Failed to list tenants' });
  }
});

// ── GET /api/admin/tenants/:id ────────────────────────────────────────────────
router.get('/tenants/:id', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const [tenantRes, usersRes, modulesRes] = await Promise.all([
      query('SELECT * FROM tenants WHERE id = $1', [id]),
      query('SELECT id, email, full_name, role, is_active, last_login_at, created_at FROM user_profiles WHERE tenant_id = $1 ORDER BY created_at', [id]),
      query('SELECT module_id, is_active, activated_at FROM tenant_modules WHERE tenant_id = $1 ORDER BY activated_at', [id]),
    ]);
    if (!tenantRes.rows[0]) { res.status(404).json({ error: 'Tenant not found' }); return; }
    res.json({ tenant: tenantRes.rows[0], users: usersRes.rows, modules: modulesRes.rows });
  } catch (err) {
    console.error('Admin tenant detail error:', err);
    res.status(500).json({ error: 'Failed to get tenant' });
  }
});

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT
        (SELECT COUNT(*) FROM tenants WHERE is_active = true)::int AS total_tenants,
        (SELECT COUNT(*) FROM user_profiles WHERE is_active = true)::int AS total_users,
        (SELECT COUNT(*) FROM tenants WHERE created_at > NOW() - INTERVAL '30 days')::int AS new_tenants_30d,
        (SELECT COUNT(*) FROM user_profiles WHERE last_login_at > NOW() - INTERVAL '7 days')::int AS active_users_7d
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ── POST /api/admin/tenants/:id/toggle ───────────────────────────────────────
router.post('/tenants/:id/toggle', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query(
      'UPDATE tenants SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, name, is_active',
      [id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Tenant not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle tenant' });
  }
});

// ── GET /api/admin/modules ────────────────────────────────────────────────────
router.get('/modules', adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'SELECT module_id, name, description, category, price, is_free, is_active, sort_order FROM module_catalog ORDER BY sort_order',
    );
    res.json({ modules: result.rows });
  } catch (err) {
    console.error('Admin modules error:', err);
    res.status(500).json({ error: 'Failed to list modules' });
  }
});

// ── PUT /api/admin/modules/:moduleId ─────────────────────────────────────────
router.put('/modules/:moduleId', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { moduleId } = req.params;
    const { price, is_free, is_active, name, description } = req.body;

    const result = await query(`
      UPDATE module_catalog
      SET
        price       = COALESCE($1, price),
        is_free     = COALESCE($2, is_free),
        is_active   = COALESCE($3, is_active),
        name        = COALESCE($4, name),
        description = COALESCE($5, description),
        updated_at  = NOW()
      WHERE module_id = $6
      RETURNING module_id, name, price, is_free, is_active
    `, [price ?? null, is_free ?? null, is_active ?? null, name ?? null, description ?? null, moduleId]);

    if (!result.rows[0]) { res.status(404).json({ error: 'Module not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update module error:', err);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// ── POST /api/admin/seed ──────────────────────────────────────────────────────
router.post('/seed',
  [body('email').isEmail(), body('password').isLength({ min: 8 }), body('full_name').notEmpty()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

      const count = await query('SELECT COUNT(*) FROM platform_admins');
      if (parseInt(count.rows[0].count) > 0) {
        res.status(409).json({ error: 'Super admin already exists. Use login instead.' }); return;
      }

      const { email, password, full_name } = req.body;
      const hash = await bcrypt.hash(password, 12);
      const result = await query(
        'INSERT INTO platform_admins (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name',
        [email, hash, full_name]
      );
      res.status(201).json({ admin: result.rows[0], message: 'Super admin created successfully' });
    } catch (err) {
      console.error('Admin seed error:', err);
      res.status(500).json({ error: 'Seed failed. Make sure the platform_admins table exists in the database.' });
    }
  }
);

export default router;
