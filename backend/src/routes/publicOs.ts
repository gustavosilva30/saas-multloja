import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { param, body, validationResult } from 'express-validator';
import { query, withTransaction } from '../config/database';
import { PoolClient } from 'pg';

// Rota completamente pública — sem authenticateToken.
// Acessada pelo cliente final via link único da OS.
const router = Router();

// 🔒 A5: Rate-limit no GET para evitar enumeração/scraping de tokens
const viewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,                                                // 1 view a cada 15s em média
  keyGenerator: (req) => `view|${req.ip}|${req.params.token}`,
  message: { error: 'Muitas tentativas de visualização. Aguarde alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔒 A5: Rate-limit estrito no POST de aprovação — chave por IP+token
const approveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,                               // 1 hora
  max: 10,
  keyGenerator: (req) => `approve|${req.ip}|${req.params.token}`,
  message: { error: 'Muitas tentativas de aprovação. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── GET /api/public/os/:token — visualização pública ─────────────────────────
router.get(
  '/:token',
  viewLimiter,
  param('token').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const osRes = await query(
        `SELECT so.id, so.os_number, so.status, so.asset_metadata,
                so.customer_notes, so.expected_at,
                so.subtotal, so.discount, so.total,
                so.created_at,
                c.name  AS customer_name,
                t.name  AS tenant_name
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           LEFT JOIN tenants   t ON t.id = so.tenant_id
          WHERE so.access_token = $1`,
        [req.params.token]
      );

      if (osRes.rows.length === 0) {
        res.status(404).json({ error: 'Ordem de Serviço não encontrada' }); return;
      }

      const os = osRes.rows[0];

      const itemsRes = await query(
        `SELECT item_type, description, quantity, unit_price, discount, total_price
           FROM service_order_items
          WHERE os_id = $1
          ORDER BY item_type DESC, created_at`,
        [os.id]
      );

      // Não expõe notas internas nem IDs sensíveis
      res.json({
        service_order: {
          os_number:     os.os_number,
          status:        os.status,
          asset_metadata: os.asset_metadata,
          customer_notes: os.customer_notes,
          expected_at:   os.expected_at,
          subtotal:      os.subtotal,
          discount:      os.discount,
          total:         os.total,
          created_at:    os.created_at,
          customer_name: os.customer_name,
          tenant_name:   os.tenant_name,
          items:         itemsRes.rows,
        },
      });
    } catch (err) {
      console.error('Public OS view error:', err);
      res.status(500).json({ error: 'Falha ao carregar OS' });
    }
  }
);

// ── POST /api/public/os/:token/approve — aprovação pelo cliente ───────────────
router.post(
  '/:token/approve',
  approveLimiter,
  param('token').isUUID(),
  body('customer_signature').optional().isString().isLength({ max: 100 }),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      await withTransaction(async (client: PoolClient) => {
        const osRes = await client.query(
          `SELECT id, tenant_id, status, os_number
             FROM service_orders
            WHERE access_token = $1
            FOR UPDATE`,
          [req.params.token]
        );

        if (osRes.rows.length === 0) {
          throw Object.assign(new Error('OS não encontrada'), { statusCode: 404 });
        }

        const os = osRes.rows[0];

        if (os.status !== 'PENDING_APPROVAL') {
          throw Object.assign(
            new Error(`Esta OS está com status "${os.status}" e não pode ser aprovada agora.`),
            { statusCode: 422 }
          );
        }

        await client.query(
          `UPDATE service_orders SET status = 'APPROVED', updated_at = NOW() WHERE id = $1`,
          [os.id]
        );

        // Forensics: registra IP + User-Agent na nota de aprovação
        const sig = req.body.customer_signature ? String(req.body.customer_signature).slice(0, 100) : null;
        const ua  = String(req.headers['user-agent'] || '').slice(0, 200);
        const ip  = req.ip || 'unknown';
        const note = sig
          ? `Aprovado por: ${sig} | IP: ${ip} | UA: ${ua}`
          : `Aprovação digital via link público | IP: ${ip} | UA: ${ua}`;

        await client.query(
          `INSERT INTO service_order_status_history
             (os_id, changed_by, from_status, to_status, note)
           VALUES ($1, NULL, 'PENDING_APPROVAL', 'APPROVED', $2)`,
          [os.id, note]
        );
      });

      res.json({ ok: true, message: 'Ordem de Serviço aprovada com sucesso!' });
    } catch (err: any) {
      console.error('Public OS approve error:', err);
      res.status(err.statusCode ?? 500).json({ error: err.message || 'Falha ao aprovar OS' });
    }
  }
);

export default router;
