import { Router, Request, Response } from 'express';
import { body, query as queryValidator, validationResult } from 'express-validator';
import { query, withTransaction } from '../config/database';
import { authenticateToken, authorize, tenantIsolation } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);
router.use(tenantIsolation);

// List products with pagination and filters
router.get(
  '/',
  [
    queryValidator('page').optional().isInt({ min: 1 }),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
    queryValidator('search').optional().trim(),
    queryValidator('category_id').optional().isUUID(),
    queryValidator('is_active').optional().isBoolean(),
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
      const categoryId = req.query.category_id as string;
      const isActive = req.query.is_active as string;

      // Build query
      let whereClause = 'WHERE p.tenant_id = $1';
      const params: any[] = [tenantId];
      let paramIndex = 1;

      if (search) {
        paramIndex++;
        whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR p.barcode ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
      }

      if (categoryId) {
        paramIndex++;
        whereClause += ` AND p.category_id = $${paramIndex}`;
        params.push(categoryId);
      }

      if (isActive !== undefined) {
        paramIndex++;
        whereClause += ` AND p.is_active = $${paramIndex}`;
        params.push(isActive === 'true');
      }

      // Count total
      const countResult = await query(
        `SELECT COUNT(*) FROM products p ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Get products
      const productsResult = await query(
        `SELECT p.*, c.name as category_name 
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`,
        [...params, limit, offset]
      );

      res.json({
        products: productsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('List products error:', error);
      res.status(500).json({ error: 'Failed to list products' });
    }
  }
);

// Get single product
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const productId = req.params.id;

    const result = await query(
      `SELECT p.*, c.name as category_name 
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [productId, tenantId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({ product: result.rows[0] });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// Create product
router.post(
  '/',
  authorize('owner', 'admin', 'operator'),
  [
    body('name').trim().isLength({ min: 2 }),
    body('sku').trim().isLength({ min: 1 }),
    body('sale_price').isFloat({ min: 0 }),
    body('cost_price').optional().isFloat({ min: 0 }),
    body('stock_quantity').optional().isInt({ min: 0 }),
    body('category_id').optional().isUUID(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const tenantId = req.user!.tenant_id;
      const {
        name,
        sku,
        description,
        category_id,
        cost_price,
        sale_price,
        stock_quantity,
        min_stock,
        unit,
        barcode,
        image_url,
      } = req.body;

      // Check SKU uniqueness within tenant
      const existingSku = await query(
        'SELECT id FROM products WHERE tenant_id = $1 AND sku = $2',
        [tenantId, sku]
      );

      if (existingSku.rows.length > 0) {
        res.status(409).json({ error: 'SKU already exists in this tenant' });
        return;
      }

      const result = await query(
        `INSERT INTO products 
         (tenant_id, name, sku, description, category_id, cost_price, sale_price, 
          stock_quantity, min_stock, unit, barcode, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          tenantId,
          name,
          sku,
          description,
          category_id,
          cost_price || 0,
          sale_price,
          stock_quantity || 0,
          min_stock || 0,
          unit || 'UN',
          barcode,
          image_url,
        ]
      );

      res.status(201).json({ product: result.rows[0] });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
);

// Update product
router.put(
  '/:id',
  authorize('owner', 'admin', 'operator'),
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('sale_price').optional().isFloat({ min: 0 }),
    body('stock_quantity').optional().isInt({ min: 0 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const tenantId = req.user!.tenant_id;
      const productId = req.params.id;

      // Check if product exists and belongs to tenant
      const existing = await query(
        'SELECT id FROM products WHERE id = $1 AND tenant_id = $2',
        [productId, tenantId]
      );

      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 0;

      const fields = [
        'name',
        'sku',
        'description',
        'category_id',
        'cost_price',
        'sale_price',
        'stock_quantity',
        'min_stock',
        'unit',
        'barcode',
        'image_url',
        'is_active',
      ];

      fields.forEach((field) => {
        if (req.body[field] !== undefined) {
          paramIndex++;
          updates.push(`${field} = $${paramIndex}`);
          values.push(req.body[field]);
        }
      });

      if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      paramIndex++;
      values.push(productId);

      const result = await query(
        `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() 
         WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      res.json({ product: result.rows[0] });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
);

// Delete product (soft delete - set is_active = false)
router.delete(
  '/:id',
  authorize('owner', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.user!.tenant_id;
      const productId = req.params.id;

      // Check if product exists
      const existing = await query(
        'SELECT id FROM products WHERE id = $1 AND tenant_id = $2',
        [productId, tenantId]
      );

      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // Soft delete
      await query(
        'UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1',
        [productId]
      );

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
);

// Update stock
router.patch(
  '/:id/stock',
  authorize('owner', 'admin', 'operator'),
  [
    body('quantity').isInt(),
    body('reason').optional().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const tenantId = req.user!.tenant_id;
      const productId = req.params.id;
      const { quantity, reason } = req.body;

      // Update stock
      const result = await query(
        `UPDATE products 
         SET stock_quantity = stock_quantity + $1, updated_at = NOW() 
         WHERE id = $2 AND tenant_id = $3
         RETURNING *`,
        [quantity, productId, tenantId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // TODO: Log stock movement to audit table

      res.json({
        product: result.rows[0],
        adjustment: quantity,
        reason: reason || 'Manual adjustment',
      });
    } catch (error) {
      console.error('Update stock error:', error);
      res.status(500).json({ error: 'Failed to update stock' });
    }
  }
);

export default router;
