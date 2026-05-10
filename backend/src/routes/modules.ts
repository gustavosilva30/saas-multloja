import { Router, Request, Response } from 'express';
import { query, withTransaction } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { chargeNewCustomerPix, createAsaasPayment } from '../services/asaasService';

const router = Router();
router.use(authenticateToken);

// ── GET /api/modules/catalog ──────────────────────────────────────────────────
// Lista todos os módulos do catálogo com status do tenant atual
router.get('/catalog', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;

    const result = await query(`
      SELECT
        mc.module_id,
        mc.name,
        mc.description,
        mc.category,
        mc.price,
        mc.is_free,
        mc.sort_order,
        COALESCE(tm.is_active, false)       AS is_active,
        COALESCE(tm.payment_status, 'free') AS payment_status,
        tm.asaas_payment_id,
        tm.paid_at,
        tm.expires_at
      FROM module_catalog mc
      LEFT JOIN tenant_modules tm
        ON tm.module_id = mc.module_id AND tm.tenant_id = $1
      WHERE mc.is_active = true
      ORDER BY mc.sort_order
    `, [tenantId]);

    res.json({ modules: result.rows });
  } catch (err) {
    console.error('Catalog error:', err);
    res.status(500).json({ error: 'Failed to load catalog' });
  }
});

// ── GET /api/modules ──────────────────────────────────────────────────────────
// Módulos ativos do tenant (para o sidebar)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT tm.module_id
       FROM tenant_modules tm
       WHERE tm.tenant_id = $1
         AND tm.is_active = true
         AND (tm.payment_status = 'free' OR tm.payment_status = 'paid')`,
      [req.user!.tenant_id]
    );
    res.json({ modules: result.rows.map((r: { module_id: string }) => r.module_id) });
  } catch (err) {
    console.error('Modules error:', err);
    res.status(500).json({ error: 'Failed to load modules' });
  }
});

// ── PUT /api/modules ──────────────────────────────────────────────────────────
// Sincroniza módulos gratuitos ativos (sidebar toggle)
router.put('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { modules } = req.body as { modules: string[] };
    if (!Array.isArray(modules)) { res.status(400).json({ error: 'modules must be an array' }); return; }

    const tenantId = req.user!.tenant_id;

    // Só desativa módulos gratuitos — pagos não podem ser desativados por essa rota
    await query(`
      UPDATE tenant_modules
      SET is_active = false
      WHERE tenant_id = $1
        AND (payment_status = 'free' OR payment_status IS NULL)
    `, [tenantId]);

    if (modules.length > 0) {
      await query(`
        INSERT INTO tenant_modules (tenant_id, module_id, is_active, payment_status, activated_at)
        SELECT $1, unnest($2::text[]), true, 'free', NOW()
        ON CONFLICT (tenant_id, module_id)
        DO UPDATE SET is_active = true, activated_at = NOW()
        WHERE tenant_modules.payment_status = 'free' OR tenant_modules.payment_status IS NULL
      `, [tenantId, modules]);
    }

    res.json({ ok: true, modules });
  } catch (err) {
    console.error('Sync modules error:', err);
    res.status(500).json({ error: 'Failed to sync modules' });
  }
});

// ── POST /api/modules/:moduleId/purchase ──────────────────────────────────────
// Inicia a compra de um módulo premium via Pix (Asaas)
router.post('/:moduleId/purchase', async (req: Request, res: Response): Promise<void> => {
  try {
    const { moduleId } = req.params;
    const tenantId = req.user!.tenant_id;

    // Buscar dados do módulo
    const [moduleRes, tenantRes] = await Promise.all([
      query('SELECT * FROM module_catalog WHERE module_id = $1 AND is_active = true', [moduleId]),
      query('SELECT * FROM tenants WHERE id = $1', [tenantId]),
    ]);

    const module = moduleRes.rows[0];
    const tenant = tenantRes.rows[0];

    if (!module) { res.status(404).json({ error: 'Módulo não encontrado' }); return; }
    if (module.is_free) { res.status(400).json({ error: 'Este módulo é gratuito' }); return; }

    // Verificar se já tem pagamento pendente ou pago
    const existingRes = await query(
      'SELECT * FROM tenant_modules WHERE tenant_id = $1 AND module_id = $2',
      [tenantId, moduleId]
    );
    const existing = existingRes.rows[0];
    if (existing?.payment_status === 'paid') {
      res.status(409).json({ error: 'Módulo já está ativo' }); return;
    }

    // Data de vencimento: amanhã
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    let result;

    if (!tenant.asaas_customer_id) {
      // Primeiro pagamento: cria cliente no Asaas
      const { cpfCnpj, mobilePhone } = req.body;
      result = await chargeNewCustomerPix({
        tenantId,
        tenantName: tenant.name,
        cpfCnpj,
        email: req.user!.email,
        mobilePhone,
        value: Number(module.price),
        description: `NexusERP — Módulo ${module.name}`,
        dueDate: dueDateStr,
      });

      // Salvar asaas_customer_id no tenant
      await query(
        'UPDATE tenants SET asaas_customer_id = $1, updated_at = NOW() WHERE id = $2',
        [result.asaasCustomerId, tenantId]
      );
    } else {
      // Cliente já existe no Asaas
      const payment = await createAsaasPayment({
        customer: tenant.asaas_customer_id,
        billingType: 'PIX',
        value: Number(module.price),
        dueDate: dueDateStr,
        description: `NexusERP — Módulo ${module.name}`,
        externalReference: tenantId,
      });

      const { getAsaasPixQrCode } = await import('../services/asaasService');
      const pixQrCode = await getAsaasPixQrCode(payment.id);
      result = { asaasCustomerId: tenant.asaas_customer_id, payment, pixQrCode };
    }

    // Registrar cobrança pendente
    await withTransaction(async (client) => {
      await client.query(`
        INSERT INTO tenant_modules (tenant_id, module_id, is_active, payment_status, asaas_payment_id, activated_at)
        VALUES ($1, $2, false, 'pending', $3, NOW())
        ON CONFLICT (tenant_id, module_id)
        DO UPDATE SET payment_status = 'pending', asaas_payment_id = $3
      `, [tenantId, moduleId, result.payment.id]);
    });

    res.json({
      payment_id: result.payment.id,
      value: result.payment.value,
      pix: {
        qr_code_image: result.pixQrCode.encodedImage,
        copia_e_cola: result.pixQrCode.payload,
        expires_at: result.pixQrCode.expirationDate,
      },
    });
  } catch (err) {
    console.error('Purchase error:', err);
    res.status(500).json({ error: 'Falha ao gerar cobrança. Tente novamente.' });
  }
});

export default router;
