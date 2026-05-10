import { Router, Request, Response } from 'express';
import { body, query as queryValidator, validationResult } from 'express-validator';
import { query, withTransaction } from '../config/database';
import { authenticateToken, authorize, tenantIsolation } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(tenantIsolation);

// List sales
router.get(
  '/',
  [
    queryValidator('page').optional().isInt({ min: 1 }),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
    queryValidator('status').optional().isIn(['pending', 'completed', 'cancelled']),
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
      const status = req.query.status as string;

      let whereClause = 'WHERE s.tenant_id = $1';
      const params: any[] = [tenantId];

      if (status) {
        whereClause += ` AND s.status = $${params.length + 1}`;
        params.push(status);
      }

      const countResult = await query(`SELECT COUNT(*) FROM sales s ${whereClause}`, params);
      const total = parseInt(countResult.rows[0].count);

      const result = await query(
        `SELECT s.*, c.name as customer_name, u.full_name as seller_name
         FROM sales s
         LEFT JOIN customers c ON s.customer_id = c.id
         LEFT JOIN user_profiles u ON s.user_id = u.id
         ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      res.json({
        sales: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List sales error:', error);
      res.status(500).json({ error: 'Failed to list sales' });
    }
  }
);

// Get single sale with items
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;

    const saleResult = await query(
      `SELECT s.*, c.name as customer_name, u.full_name as seller_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN user_profiles u ON s.user_id = u.id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [req.params.id, tenantId]
    );

    if (saleResult.rows.length === 0) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const itemsResult = await query(
      `SELECT si.*, p.name as product_name, p.sku
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = $1`,
      [req.params.id]
    );

    res.json({ sale: saleResult.rows[0], items: itemsResult.rows });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ error: 'Failed to get sale' });
  }
});

// Create sale
router.post(
  '/',
  authorize('owner', 'admin', 'operator'),
  [
    body('items').isArray({ min: 1 }),
    body('items.*.product_id').isUUID(),
    body('items.*.quantity').isFloat({ min: 0.001, max: 1_000_000 }),
    body('items.*.unit_price').isFloat({ min: 0, max: 9_999_999.99 }),
    body('customer_id').optional().isUUID(),
    body('payment_method').optional().trim(),
    body('discount').optional().isFloat({ min: 0, max: 9_999_999.99 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const tenantId = req.user!.tenant_id;
      const userId = req.user!.id;
      const { items, customer_id, payment_method, discount, notes } = req.body;

      const result = await withTransaction(async (client) => {
        // Calculate total
        const total = items.reduce((sum: number, item: any) => {
          return sum + item.quantity * item.unit_price;
        }, 0);
        const finalTotal = total - (discount || 0);

        // Create sale
        const saleResult = await client.query(
          `INSERT INTO sales (tenant_id, user_id, customer_id, total, discount, payment_method, notes, status, payment_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', 'paid') RETURNING *`,
          [tenantId, userId, customer_id, finalTotal, discount || 0, payment_method, notes]
        );
        const sale = saleResult.rows[0];

        // Insert items and update stock
        for (const item of items) {
          const totalPrice = item.quantity * item.unit_price;

          await client.query(
            `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
             VALUES ($1, $2, $3, $4, $5)`,
            [sale.id, item.product_id, item.quantity, item.unit_price, totalPrice]
          );

          await client.query(
            'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND tenant_id = $3',
            [item.quantity, item.product_id, tenantId]
          );
        }

        return sale;
      });

      res.status(201).json({ sale: result });
    } catch (error) {
      console.error('Create sale error:', error);
      res.status(500).json({ error: 'Failed to create sale' });
    }
  }
);

// Cancel sale
router.patch('/:id/cancel', authorize('owner', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `UPDATE sales SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status != 'cancelled' RETURNING *`,
      [req.params.id, req.user!.tenant_id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Sale not found or already cancelled' });
      return;
    }
    res.json({ sale: result.rows[0] });
  } catch (error) {
    console.error('Cancel sale error:', error);
    res.status(500).json({ error: 'Failed to cancel sale' });
  }
});

export default router;
