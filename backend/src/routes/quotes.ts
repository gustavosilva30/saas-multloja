import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query, withTransaction } from '../config/database';
import { authenticateToken, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// List budgets
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const result = await query(
      `SELECT q.*, 
              COALESCE(c.name, q.guest_name) as display_name,
              u.full_name as user_name
       FROM quotes q
       LEFT JOIN customers c ON q.customer_id = c.id
       LEFT JOIN user_profiles u ON q.user_id = u.id
       WHERE q.tenant_id = $1
       ORDER BY q.created_at DESC`,
      [tenantId]
    );
    res.json({ quotes: result.rows });
  } catch (error) {
    console.error('List quotes error:', error);
    res.status(500).json({ error: 'Erro ao listar orçamentos' });
  }
});

// Get budget details
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const quoteResult = await query(
      `SELECT q.*, c.name as customer_name, u.full_name as user_name
       FROM quotes q
       LEFT JOIN customers c ON q.customer_id = c.id
       LEFT JOIN user_profiles u ON q.user_id = u.id
       WHERE q.id = $1 AND q.tenant_id = $2`,
      [req.params.id, tenantId]
    );

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Orçamento não encontrado' });
      return;
    }

    const itemsResult = await query(
      `SELECT qi.*, p.name as product_name, p.sku
       FROM quote_items qi
       LEFT JOIN products p ON qi.product_id = p.id
       WHERE qi.quote_id = $1
       ORDER BY qi.created_at ASC`,
      [req.params.id]
    );

    res.json({ quote: quoteResult.rows[0], items: itemsResult.rows });
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ error: 'Erro ao buscar orçamento' });
  }
});

// Create budget
router.post(
  '/',
  [
    body('items').isArray({ min: 1 }),
    body('items.*.quantity').isFloat({ min: 0.001 }),
    body('items.*.unit_price').isFloat({ min: 0 }),
    body('customer_id').optional({ nullable: true }).isUUID(),
    body('guest_name').optional().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const tenantId = req.user!.tenant_id;
      const userId = req.user!.id;
      const { 
        items, 
        customer_id, 
        guest_name, 
        guest_phone, 
        guest_document,
        guest_address,
        notes,
        discount,
        shipping,
        validity_days
      } = req.body;

      const result = await withTransaction(async (client) => {
        // Calculate totals
        const subtotal = items.reduce((sum: number, item: any) => {
          return sum + (item.quantity * item.unit_price);
        }, 0);
        const total = subtotal - (discount || 0) + (shipping || 0);

        // Get next quote number
        const numRes = await client.query('SELECT next_quote_number($1) as num', [tenantId]);
        const quoteNumber = numRes.rows[0].num;

        // Insert quote
        const quoteResult = await client.query(
          `INSERT INTO quotes (
            tenant_id, customer_id, user_id, quote_number,
            status, guest_name, guest_phone, guest_document, guest_address,
            subtotal, discount, shipping, total, validity_days, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *`,
          [
            tenantId,
            customer_id || null, 
            userId,
            quoteNumber,
            'pending',
            guest_name || null,
            guest_phone || null,
            guest_document || null,
            guest_address || null,
            subtotal,
            discount || 0,
            shipping || 0,
            total,
            validity_days || 30,
            notes || null
          ]
        );
        const quote = quoteResult.rows[0];

        // Insert items
        for (const item of items) {
          const itemTotal = (item.quantity * item.unit_price) - (item.discount || 0);
          
          await client.query(
            `INSERT INTO quote_items (
              quote_id, product_id, description, is_adhoc,
              quantity, unit_price, discount, total_price
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              quote.id, 
              item.product_id || null, 
              item.description || 'Produto sem nome',
              item.is_adhoc || false,
              item.quantity, 
              item.unit_price, 
              item.discount || 0, 
              itemTotal
            ]
          );
        }

        return quote;
      });

      res.status(201).json({ quote: result });
    } catch (error) {
      console.error('Create quote error:', error);
      res.status(500).json({ error: 'Erro ao criar orçamento' });
    }
  }
);

// Convert budget to sale
router.post('/:id/convert', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await withTransaction(async (client) => {
      // 1. Get quote
      const quoteRes = await client.query(
        'SELECT * FROM quotes WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      if (quoteRes.rows.length === 0) throw new Error('Orçamento não encontrado');
      const quote = quoteRes.rows[0];
      if (quote.status === 'converted') throw new Error('Este orçamento já foi convertido em venda');

      // 2. Get items
      const itemsRes = await client.query(
        'SELECT * FROM quote_items WHERE quote_id = $1',
        [id]
      );
      const items = itemsRes.rows;

      // 3. Create sale
      const saleRes = await client.query(
        `INSERT INTO sales (
          tenant_id, customer_id, user_id, status, 
          total, discount, payment_method, notes, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          tenantId,
          quote.customer_id,
          userId,
          'pending',
          quote.total,
          quote.discount,
          'cash', // default
          `Convertido do orçamento #${quote.quote_number}. ${quote.notes || ''}`,
          { quote_id: quote.id }
        ]
      );
      const sale = saleRes.rows[0];

      // 4. Create sale items
      for (const item of items) {
        await client.query(
          `INSERT INTO sale_items (
            sale_id, product_id, quantity, unit_price, total_price, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            sale.id,
            item.product_id,
            item.quantity,
            item.unit_price,
            item.total_price,
            { quote_item_id: item.id, is_adhoc: item.is_adhoc, description: item.description }
          ]
        );

        // 5. Deduct stock if it's a real product
        if (item.product_id) {
          await client.query(
            'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND tenant_id = $3',
            [item.quantity, item.product_id, tenantId]
          );
        }
      }

      // 6. Update quote status
      await client.query(
        'UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2',
        ['converted', id]
      );

      return sale;
    });

    res.json({ sale: result });
  } catch (error: any) {
    console.error('Convert quote error:', error);
    res.status(400).json({ error: error.message || 'Erro ao converter orçamento' });
  }
});

export default router;
