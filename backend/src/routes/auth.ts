import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query, withTransaction } from '../config/database';
import { config } from '../config';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// JWT payload interface
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

// Register new user with tenant
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').trim().isLength({ min: 2 }),
    body('tenant_name').trim().isLength({ min: 2 }),
    body('niche').optional().isIn(['varejo', 'oficina', 'clinica', 'restaurante', 'outros']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, full_name, tenant_name, niche } = req.body;

      // Check if email already exists
      const existingUser = await query(
        'SELECT id FROM user_profiles WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create tenant and user in transaction
      const result = await withTransaction(async (client) => {
        // Create tenant
        const tenantResult = await client.query(
          'INSERT INTO tenants (name, niche, is_active, created_at, updated_at) VALUES ($1, $2, true, NOW(), NOW()) RETURNING id',
          [tenant_name, niche || 'outros']
        );
        const tenantId = tenantResult.rows[0].id;

        // Create user profile (owner)
        const userResult = await client.query(
          `INSERT INTO user_profiles 
           (email, password_hash, full_name, role, tenant_id, is_active, created_at, updated_at) 
           VALUES ($1, $2, $3, 'owner', $4, true, NOW(), NOW()) 
           RETURNING id, email, role, tenant_id`,
          [email, hashedPassword, full_name, tenantId]
        );

        return userResult.rows[0];
      });

      // Generate JWT
      const token = jwt.sign(
        {
          userId: result.id,
          email: result.email,
          role: result.role,
          tenantId: result.tenant_id,
        } as JWTPayload,
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      res.status(201).json({
        token,
        user: {
          id: result.id,
          email: result.email,
          role: result.role,
          tenant_id: result.tenant_id,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      // Find user with password
      const userResult = await query(
        `SELECT id, email, password_hash, role, tenant_id, full_name, is_active 
         FROM user_profiles WHERE email = $1`,
        [email]
      );

      if (userResult.rows.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const user = userResult.rows[0];

      if (!user.is_active) {
        res.status(403).json({ error: 'Account is disabled' });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Update last login
      await query(
        'UPDATE user_profiles SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate JWT
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenant_id,
        } as JWTPayload,
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          tenant_id: user.tenant_id,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Get current user
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userResult = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.tenant_id, u.created_at,
              t.name as tenant_name, t.niche
       FROM user_profiles u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
      [req.user!.id]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Change password
router.post(
  '/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.id;

      // Get current password hash
      const userResult = await query(
        'SELECT password_hash FROM user_profiles WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Verify current password
      const isValid = await bcrypt.compare(
        currentPassword,
        userResult.rows[0].password_hash
      );

      if (!isValid) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await query(
        'UPDATE user_profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newHash, userId]
      );

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// Refresh token
router.post('/refresh', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // Generate new token with extended expiry
    const token = jwt.sign(
      {
        userId: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        tenantId: req.user!.tenant_id,
      } as JWTPayload,
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.json({ token });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

export default router;
