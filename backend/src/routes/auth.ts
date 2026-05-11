import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { query, withTransaction, tenantContext } from '../config/database';
import { config } from '../config';
import { authenticateToken } from '../middleware/auth';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.email || '').toLowerCase()}`,
});

const router = Router();

// ── Token helpers ─────────────────────────────────────────────────────────────

interface AccessPayload {
  userId:   string;
  email:    string;
  role:     string;
  tenantId: string;
}
interface RefreshPayload {
  userId:       string;
  tokenVersion: number;
}

const REFRESH_COOKIE = 'rt';

function signAccess(payload: AccessPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN as any });
}

function signRefresh(payload: RefreshPayload): string {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRES_IN as any });
}

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure:   config.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/api/auth',                       // só vai para rotas de auth
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure:   config.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/api/auth',
  });
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    body('full_name').trim().isLength({ min: 2, max: 100 }),
    body('tenant_name').trim().isLength({ min: 2, max: 100 }),
    body('niche').optional().isString(),
    body('niche_template_id').optional().isUUID(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

      const { email, password, full_name, tenant_name, niche, niche_template_id } = req.body;

      const existing = await query('SELECT id FROM user_profiles WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        res.status(409).json({ error: 'Email already registered' }); return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await withTransaction(async (client) => {
        const tenantRes = await client.query(
          `INSERT INTO tenants (name, niche, niche_template_id, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, true, NOW(), NOW()) RETURNING id`,
          [tenant_name, niche || 'outros', niche_template_id || null]
        );
        const tenantId = tenantRes.rows[0].id;

        // Ativa o contexto para permitir a inserção do usuário (RLS)
        await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);

        const userRes = await client.query(
          `INSERT INTO user_profiles
             (email, password_hash, full_name, role, tenant_id, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, 'owner', $4, true, NOW(), NOW())
           RETURNING id, email, full_name, role, tenant_id, token_version`,
          [email, hashedPassword, full_name, tenantId]
        );
        return userRes.rows[0];
      });

      const access  = signAccess({  userId: user.id, email: user.email, role: user.role, tenantId: user.tenant_id });
      const refresh = signRefresh({ userId: user.id, tokenVersion: user.token_version });
      setRefreshCookie(res, refresh);

      res.status(201).json({
        token: access,
        user: {
          id: user.id, email: user.email, full_name: user.full_name,
          role: user.role, tenant_id: user.tenant_id,
        },
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

      const { email, password } = req.body;

      const userRes = await query(
        `SELECT * FROM find_user_by_email($1)`,
        [email]
      );
      if (userRes.rows.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' }); return;
      }
      const user = userRes.rows[0];

      if (!user.is_active) { res.status(403).json({ error: 'Account is disabled' }); return; }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid)         { res.status(401).json({ error: 'Invalid credentials' }); return; }

      // Ativa o contexto do tenant para as próximas operações (update last_login e logs)
      await tenantContext.run({ tenantId: user.tenant_id }, async () => {
        await query('UPDATE user_profiles SET last_login_at = NOW() WHERE id = $1', [user.id]);

        const access  = signAccess({  userId: user.id, email: user.email, role: user.role, tenantId: user.tenant_id });
        const refresh = signRefresh({ userId: user.id, tokenVersion: user.token_version });
        setRefreshCookie(res, refresh);

        res.json({
          token: access,
          user: {
            id: user.id, email: user.email, full_name: user.full_name,
            role: user.role, tenant_id: user.tenant_id,
          },
        });
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ── POST /api/auth/refresh ───────────────────────────────────────────────────
// Lê o cookie httpOnly, valida tokenVersion no DB, devolve novo access token e
// rotaciona o refresh (rotation = se um refresh vazar, fica inutilizável após o
// próximo uso legítimo).
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const rt = req.cookies?.[REFRESH_COOKIE];
    if (!rt) { res.status(401).json({ error: 'No refresh token' }); return; }

    let decoded: RefreshPayload;
    try {
      decoded = jwt.verify(rt, config.JWT_REFRESH_SECRET) as RefreshPayload;
    } catch {
      clearRefreshCookie(res);
      res.status(401).json({ error: 'Refresh token inválido ou expirado' }); return;
    }

    const r = await query(
      `SELECT * FROM find_user_by_id($1)`,
      [decoded.userId]
    );
    const user = r.rows[0];

    if (!user || !user.is_active || user.token_version !== decoded.tokenVersion) {
      clearRefreshCookie(res);
      res.status(401).json({ error: 'Sessão revogada — faça login novamente' }); return;
    }

    const access     = signAccess({  userId: user.id, email: user.email, role: user.role, tenantId: user.tenant_id });
    const newRefresh = signRefresh({ userId: user.id, tokenVersion: user.token_version });
    setRefreshCookie(res, newRefresh);

    res.json({
      token: access,
      user: {
        id: user.id, email: user.email, full_name: user.full_name,
        role: user.role, tenant_id: user.tenant_id,
      },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Failed to refresh' });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
// Incrementa token_version → invalida TODOS os refresh tokens existentes do user.
router.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    await query(
      `UPDATE user_profiles SET token_version = token_version + 1 WHERE id = $1`,
      [req.user!.id]
    );
    clearRefreshCookie(res);
    res.json({ ok: true });
  } catch (err) {
    console.error('Logout error:', err);
    clearRefreshCookie(res);                // sempre limpa cookie, mesmo em erro
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const r = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.tenant_id, u.created_at,
              t.name as tenant_name, t.niche
         FROM user_profiles u
         JOIN tenants t ON u.tenant_id = t.id
        WHERE u.id = $1`,
      [req.user!.id]
    );
    if (r.rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user: r.rows[0] });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ── POST /api/auth/change-password ───────────────────────────────────────────
// Após trocar senha, incrementa token_version → invalida sessões antigas.
router.post(
  '/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty(),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.id;

      const r = await query('SELECT password_hash FROM user_profiles WHERE id = $1', [userId]);
      if (r.rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }

      const ok = await bcrypt.compare(currentPassword, r.rows[0].password_hash);
      if (!ok) { res.status(401).json({ error: 'Current password is incorrect' }); return; }

      const newHash = await bcrypt.hash(newPassword, 12);
      await query(
        `UPDATE user_profiles
           SET password_hash = $1, token_version = token_version + 1, updated_at = NOW()
         WHERE id = $2`,
        [newHash, userId]
      );

      // 🔒 Cookie atual fica inválido — força re-login em todos os dispositivos
      clearRefreshCookie(res);
      res.json({ message: 'Password changed successfully — re-login required' });
    } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

export default router;
