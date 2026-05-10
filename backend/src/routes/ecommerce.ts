import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { query } from '../config/database';
import { config } from '../config';
import axios from 'axios';

const router = Router();

// ── Mercado Livre OAuth ───────────────────────────────────────────────────────

// 1. Iniciar fluxo (Redirecionar para ML)
router.get('/mercadolivre/auth', authenticateToken, (req: Request, res: Response) => {
  const { ML_CLIENT_ID, ML_REDIRECT_URI } = config;
  
  if (!ML_CLIENT_ID) {
    return res.status(400).json({ error: 'Mercado Livre Client ID não configurado no servidor' });
  }

  // O estado (state) carrega o tenantId para sabermos quem está conectando no callback
  const state = Buffer.from(JSON.stringify({ tenantId: req.user!.tenant_id })).toString('base64');
  
  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(ML_REDIRECT_URI)}&state=${state}`;
  
  res.redirect(authUrl);
});

// 2. Callback (ML redireciona para cá com o código)
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  
  if (!code) return res.status(400).json({ error: 'Código de autorização ausente' });

  try {
    const { tenantId } = JSON.parse(Buffer.from(state as string, 'base64').toString());

    // Trocar código por Token
    const tokenRes = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: config.ML_CLIENT_ID,
      client_secret: config.ML_CLIENT_SECRET,
      code,
      redirect_uri: config.ML_REDIRECT_URI
    });

    const { access_token, refresh_token, expires_in, user_id } = tokenRes.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Buscar apelido do usuário no ML
    const userRes = await axios.get(`https://api.mercadolibre.com/users/${user_id}`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    // Salvar ou atualizar no banco
    await query(`
      INSERT INTO mercadolivre_accounts 
        (tenant_id, ml_user_id, nickname, access_token, refresh_token, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (tenant_id, ml_user_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        nickname = EXCLUDED.nickname,
        updated_at = NOW()
    `, [tenantId, user_id, userRes.data.nickname, access_token, refresh_token, expiresAt]);

    // Redirecionar de volta para o frontend
    res.redirect(`${config.APP_PUBLIC_URL}/ecommerce?status=success&account=${userRes.data.nickname}`);
  } catch (err: any) {
    console.error('ML Callback Error:', err.response?.data || err.message);
    res.redirect(`${config.APP_PUBLIC_URL}/ecommerce?status=error&message=failed_to_exchange_token`);
  }
});

// 3. Listar contas conectadas
router.get('/mercadolivre/accounts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const r = await query(
      `SELECT id, nickname, is_active, created_at FROM mercadolivre_accounts WHERE tenant_id = $1`,
      [req.user!.tenant_id]
    );
    res.json({ accounts: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar contas' });
  }
});

// 4. Remover conta
router.delete('/mercadolivre/accounts/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    await query(
      `DELETE FROM mercadolivre_accounts WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.user!.tenant_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover conta' });
  }
});

// 5. Webhook - Receber notificações do Mercado Livre
router.post(['/mercadolivre/webhook', '/mercadolivre/callback'], async (req: Request, res: Response) => {
  const { topic, resource, user_id } = req.body;
  
  console.log(`ML Webhook received: ${topic} for user ${user_id}`);

  // Responder rápido para o ML não reenviar
  res.status(200).send('OK');

  // Processar em background
  if (topic === 'orders_v2' || topic === 'orders') {
    try {
      // Buscar a conta do tenant associada a este ml_user_id
      const accountRes = await query(
        `SELECT tenant_id, access_token FROM mercadolivre_accounts WHERE ml_user_id = $1 AND is_active = true`,
        [user_id]
      );

      if (accountRes.rows.length === 0) return;
      const { tenant_id, access_token } = accountRes.rows[0];

      // Buscar detalhes do pedido no ML
      const orderRes = await axios.get(`https://api.mercadolibre.com${resource}`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const order = orderRes.data;

      // Para cada item no pedido, dar baixa no estoque
      for (const item of order.order_items) {
        const mlItemId = item.item.id;
        const quantity = item.quantity;

        // Buscar o produto local vinculado a este item do ML
        const mappingRes = await query(
          `SELECT product_id FROM mercadolivre_items WHERE ml_item_id = $1 AND tenant_id = $2`,
          [mlItemId, tenant_id]
        );

        if (mappingRes.rows.length > 0) {
          const productId = mappingRes.rows[0].product_id;

          // Baixar estoque
          await query(
            `UPDATE products SET stock = stock - $1 WHERE id = $2 AND tenant_id = $3`,
            [quantity, productId, tenant_id]
          );

          // Registrar a venda no sistema
          await query(
            `INSERT INTO sales (tenant_id, total_amount, status, payment_method, notes)
             VALUES ($1, $2, 'completed', 'mercadolivre', $3)`,
            [tenant_id, order.total_amount, `Venda ML #${order.id} - Item: ${item.item.title}`]
          );
        }
      }
    } catch (err) {
      console.error('Error processing ML Webhook:', err);
    }
  }
});

export default router;
