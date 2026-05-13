import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// ── GET /api/users ────────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const result = await query(`
      SELECT id, email, full_name, role, job_title, is_active, last_login_at, created_at 
      FROM user_profiles 
      WHERE tenant_id = $1 
      ORDER BY created_at ASC
    `, [tenantId]);
    
    res.json({ users: result.rows });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Falha ao listar usuários' });
  }
});

// ── POST /api/users ───────────────────────────────────────────────────────────
router.post('/', 
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('A senha deve ter pelo menos 8 caracteres'),
    body('full_name').notEmpty().withMessage('Nome é obrigatório'),
    body('role').isIn(['owner', 'admin', 'operator', 'viewer']).withMessage('Role inválida'),
    body('job_title').optional().isString()
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Somente admin/owner pode criar usuários
      if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Sem permissão para criar usuários' });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

      const { email, password, full_name, role, job_title } = req.body;
      const tenantId = req.user!.tenant_id;

      // Verificar email
      const existing = await query('SELECT id FROM user_profiles WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        res.status(409).json({ error: 'Email já está em uso' }); return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await query(`
        INSERT INTO user_profiles (id, email, password_hash, full_name, role, job_title, tenant_id, is_active)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true)
        RETURNING id, email, full_name, role, job_title, is_active, created_at
      `, [email, hashedPassword, full_name, role, job_title || null, tenantId]);

      res.status(201).json({ user: result.rows[0] });
    } catch (err) {
      console.error('Create user error:', err);
      res.status(500).json({ error: 'Falha ao criar usuário' });
    }
  }
);

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
router.put('/:id', 
  [
    body('full_name').optional().notEmpty(),
    body('role').optional().isIn(['owner', 'admin', 'operator', 'viewer']),
    body('job_title').optional().isString(),
    body('is_active').optional().isBoolean()
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Sem permissão para editar usuários' });
        return;
      }

      const { id } = req.params;
      const { full_name, role, job_title, is_active } = req.body;
      const tenantId = req.user!.tenant_id;

      // Proteção: não deixar admin rebaixar/desativar o owner original
      const targetUser = await query('SELECT role FROM user_profiles WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      if (targetUser.rows.length === 0) {
        res.status(404).json({ error: 'Usuário não encontrado' }); return;
      }
      
      if (targetUser.rows[0].role === 'owner' && req.user!.id !== id) {
         res.status(403).json({ error: 'Não é possível modificar o proprietário da conta' }); return;
      }

      const result = await query(`
        UPDATE user_profiles SET
          full_name = COALESCE($1, full_name),
          role = COALESCE($2, role),
          job_title = $3,
          is_active = COALESCE($4, is_active),
          updated_at = NOW()
        WHERE id = $5 AND tenant_id = $6
        RETURNING id, email, full_name, role, job_title, is_active
      `, [full_name, role, job_title !== undefined ? job_title : null, is_active, id, tenantId]);

      res.json({ user: result.rows[0] });
    } catch (err) {
      console.error('Update user error:', err);
      res.status(500).json({ error: 'Falha ao atualizar usuário' });
    }
  }
);

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Sem permissão para excluir usuários' });
      return;
    }

    const { id } = req.params;
    const tenantId = req.user!.tenant_id;

    if (req.user!.id === id) {
      res.status(400).json({ error: 'Você não pode excluir a si mesmo' }); return;
    }

    const targetUser = await query('SELECT role FROM user_profiles WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    if (targetUser.rows.length === 0) {
      res.status(404).json({ error: 'Usuário não encontrado' }); return;
    }
    if (targetUser.rows[0].role === 'owner') {
       res.status(403).json({ error: 'Não é possível excluir o proprietário da conta' }); return;
    }

    // Soft delete / inactivate
    await query(`UPDATE user_profiles SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);

    res.json({ ok: true, message: 'Usuário inativado com sucesso' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Falha ao excluir usuário' });
  }
});

export default router;