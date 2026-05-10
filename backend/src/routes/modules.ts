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

// ── POST /api/modules/purchase-bundle ─────────────────────────────────────────
// Compra múltiplos módulos premium com um único Pix
router.post('/purchase-bundle', async (req: Request, res: Response): Promise<void> => {
  try {
    const { moduleIds, cpfCnpj, mobilePhone } = req.body as {
      moduleIds: string[];
      cpfCnpj?: string;
      mobilePhone?: string;
    };
    const tenantId = req.user!.tenant_id;

    if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
      res.status(400).json({ error: 'Selecione ao menos um módulo' }); return;
    }

    // Buscar dados dos módulos e do tenant
    const [catalogRes, tenantRes] = await Promise.all([
      query(
        `SELECT * FROM module_catalog WHERE module_id = ANY($1) AND is_active = true AND is_free = false`,
        [moduleIds]
      ),
      query('SELECT * FROM tenants WHERE id = $1', [tenantId]),
    ]);

    const modules = catalogRes.rows;
    const tenant = tenantRes.rows[0];

    if (modules.length === 0) { res.status(404).json({ error: 'Nenhum módulo premium válido encontrado' }); return; }

    // Filtrar módulos já pagos
    const existingRes = await query(
      `SELECT module_id, payment_status FROM tenant_modules WHERE tenant_id = $1 AND module_id = ANY($2)`,
      [tenantId, moduleIds]
    );
    const alreadyPaid = new Set(
      existingRes.rows.filter((r: { payment_status: string }) => r.payment_status === 'paid').map((r: { module_id: string }) => r.module_id)
    );
    const toBuy = modules.filter((m: { module_id: string }) => !alreadyPaid.has(m.module_id));
    if (toBuy.length === 0) { res.status(409).json({ error: 'Todos os módulos selecionados já estão ativos' }); return; }

    const totalValue = toBuy.reduce((sum: number, m: { price: string }) => sum + Number(m.price), 0);
    const moduleNames = toBuy.map((m: { name: string }) => m.name).join(', ');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    let paymentResult: { asaasCustomerId: string; payment: { id: string; value: number }; pixQrCode: { encodedImage: string; payload: string; expirationDate: string } };

    if (!tenant.asaas_customer_id) {
      if (!cpfCnpj || !mobilePhone) {
        res.status(422).json({ error: 'CPF/CNPJ e celular são obrigatórios no primeiro pagamento' }); return;
      }
      paymentResult = await chargeNewCustomerPix({
        tenantId,
        tenantName: tenant.name,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        email: req.user!.email,
        mobilePhone: mobilePhone.replace(/\D/g, ''),
        value: totalValue,
        description: `NexusERP — ${toBuy.length > 1 ? `${toBuy.length} módulos` : moduleNames}`,
        dueDate: dueDateStr,
      });
      await query(
        'UPDATE tenants SET asaas_customer_id = $1, updated_at = NOW() WHERE id = $2',
        [paymentResult.asaasCustomerId, tenantId]
      );
    } else {
      const payment = await createAsaasPayment({
        customer: tenant.asaas_customer_id,
        billingType: 'PIX',
        value: totalValue,
        dueDate: dueDateStr,
        description: `NexusERP — ${toBuy.length > 1 ? `${toBuy.length} módulos` : moduleNames}`,
        externalReference: tenantId,
      });
      const { getAsaasPixQrCode } = await import('../services/asaasService');
      const pixQrCode = await getAsaasPixQrCode(payment.id);
      paymentResult = { asaasCustomerId: tenant.asaas_customer_id, payment, pixQrCode };
    }

    // Registrar todos os módulos como pendentes com o mesmo payment_id
    await withTransaction(async (client) => {
      for (const mod of toBuy) {
        await client.query(`
          INSERT INTO tenant_modules (tenant_id, module_id, is_active, payment_status, asaas_payment_id, activated_at)
          VALUES ($1, $2, false, 'pending', $3, NOW())
          ON CONFLICT (tenant_id, module_id)
          DO UPDATE SET payment_status = 'pending', asaas_payment_id = $3
        `, [tenantId, mod.module_id, paymentResult.payment.id]);
      }
    });

    res.json({
      payment_id: paymentResult.payment.id,
      value: paymentResult.payment.value,
      modules: toBuy.map((m: { module_id: string; name: string; price: string }) => ({
        module_id: m.module_id,
        name: m.name,
        price: Number(m.price),
      })),
      pix: {
        qr_code_image: paymentResult.pixQrCode.encodedImage,
        copia_e_cola: paymentResult.pixQrCode.payload,
        expires_at: paymentResult.pixQrCode.expirationDate,
      },
    });
  } catch (err) {
    console.error('Bundle purchase error:', err);
    res.status(500).json({ error: 'Falha ao gerar cobrança. Tente novamente.' });
  }
});

export default router;
