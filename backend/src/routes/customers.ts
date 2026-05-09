import { Router, Request, Response } from 'express';
import { body, query as queryValidator, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken, authorize, tenantIsolation } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(tenantIsolation);

// List customers
router.get(
  '/',
  [
    queryValidator('page').optional().isInt({ min: 1 }),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
    queryValidator('search').optional().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const tenantId = req.user!.tenant_id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;

      let whereClause = 'WHERE tenant_id = $1 AND is_active = true';
      const params: any[] = [tenantId];

      if (search) {
        whereClause += ' AND (name ILIKE $2 OR document ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)';
        params.push(`%${search}%`);
      }

      const countResult = await query(`SELECT COUNT(*) FROM customers ${whereClause}`, params);
      const total = parseInt(countResult.rows[0].count);

      const result = await query(
        `SELECT * FROM customers ${whereClause} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      res.json({
        customers: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List customers error:', error);
      res.status(500).json({ error: 'Failed to list customers' });
    }
  }
);

// Get single customer
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user!.tenant_id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json({ customer: result.rows[0] });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

// Create customer
router.post(
  '/',
  authorize('owner', 'admin', 'operator'),
  [
    body('name').trim().isLength({ min: 2 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('document').optional().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const tenantId = req.user!.tenant_id;
      const { name, document, email, phone, address, birthday, notes, credit_limit } = req.body;

      const result = await query(
        `INSERT INTO customers (tenant_id, name, document, email, phone, address, birthday, notes, credit_limit)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [tenantId, name, document, email, phone, address || {}, birthday, notes, credit_limit || 0]
      );

      res.status(201).json({ customer: result.rows[0] });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }
);

// Update customer
router.put(
  '/:id',
  authorize('owner', 'admin', 'operator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.user!.tenant_id;
      const existing = await query(
        'SELECT id FROM customers WHERE id = $1 AND tenant_id = $2',
        [req.params.id, tenantId]
      );
      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      const updates: string[] = [];
      const values: any[] = [];
      let i = 0;
      const fields = ['name', 'document', 'email', 'phone', 'address', 'birthday', 'notes', 'credit_limit', 'is_active'];
      fields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${++i}`);
          values.push(req.body[field]);
        }
      });

      if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      values.push(req.params.id);
      const result = await query(
        `UPDATE customers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${++i} RETURNING *`,
        values
      );

      res.json({ customer: result.rows[0] });
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }
);

// Delete customer (soft)
router.delete('/:id', authorize('owner', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'UPDATE customers SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [req.params.id, req.user!.tenant_id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

export default router;
