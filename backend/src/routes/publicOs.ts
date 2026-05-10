import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { param, body, validationResult } from 'express-validator';
import { query, withTransaction, tenantContext } from '../config/database';
import { PoolClient } from 'pg';

// Rota completamente pública — sem authenticateToken.
// Acessada pelo cliente final via link único da OS.
// Acessada pelo cliente final via link único da OS.
const router = Router();

const publicOsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(publicOsLimiter);

// ── GET /api/public/os/:token — visualização pública ─────────────────────────
router.get(
  '/:token',
  param('token').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      // 1. Descobrir o tenant_id associado ao token ignorando RLS
      const tenantRes = await query(`SELECT get_tenant_by_os_token($1) as tenant_id`, [req.params.token]);
      const tenantId = tenantRes.rows[0]?.tenant_id;

      if (!tenantId) {
        res.status(404).json({ error: 'Ordem de Serviço não encontrada' });
        return;
      }

      // 2. Executar o restante com o contexto do tenant definido
      await tenantContext.run({ tenantId }, async () => {
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
          ORDER BY item_type DESC, created_at`,  // SERVICE primeiro
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
  param('token').isUUID(),
  body('customer_signature').optional().isString(),  // opcional: nome confirmado
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      // 1. Descobrir o tenant_id
      const tenantRes = await query(`SELECT get_tenant_by_os_token($1) as tenant_id`, [req.params.token]);
      const tenantId = tenantRes.rows[0]?.tenant_id;

      if (!tenantId) {
        res.status(404).json({ error: 'Ordem de Serviço não encontrada' });
        return;
      }

      // 2. Executar com contexto
      await tenantContext.run({ tenantId }, async () => {
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

        // Registra no histórico sem user_id (aprovação externa)
        const note = req.body.customer_signature
          ? `Aprovado digitalmente por: ${req.body.customer_signature}`
          : 'Aprovado digitalmente pelo cliente via link público';

        await client.query(
          `INSERT INTO service_order_status_history
             (os_id, changed_by, from_status, to_status, note)
           VALUES ($1, NULL, 'PENDING_APPROVAL', 'APPROVED', $2)`,
          [os.id, note]
        );
      });

        });

        res.json({ ok: true, message: 'Ordem de Serviço aprovada com sucesso!' });
      });
    } catch (err: any) {
      console.error('Public OS approve error:', err);
      res.status(err.statusCode ?? 500).json({ error: err.message || 'Falha ao aprovar OS' });
    }
  }
);

export default router;
