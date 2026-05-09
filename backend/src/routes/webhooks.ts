import { Router, Request, Response } from 'express';
import { query } from '../config/database';

const router = Router();

// Tipos dos eventos do Asaas
interface AsaasWebhookPayload {
  event: string;
  payment?: {
    id: string;
    customer: string;       // asaas_customer_id
    status: string;
    value: number;
    netValue: number;
    billingType: string;
    externalReference?: string; // tenant_id do nosso sistema
    paymentDate?: string;
    clientPaymentDate?: string;
  };
}

/**
 * POST /api/webhooks/asaas
 *
 * Recebe notificações de pagamento do Asaas.
 * O Asaas não usa assinatura de payload por padrão — recomendamos filtrar
 * por IP de origem (187.84.0.0/16) na infra (Traefik/Cloudflare).
 *
 * Eventos tratados:
 *   PAYMENT_CONFIRMED  → pagamento Pix confirmado instantaneamente
 *   PAYMENT_RECEIVED   → pagamento recebido (boleto/crédito)
 *   PAYMENT_OVERDUE    → cobrança vencida
 *   PAYMENT_DELETED    → cobrança cancelada
 */
router.post('/asaas', async (req: Request, res: Response): Promise<void> => {
  // Responder 200 imediatamente para o Asaas não retentar
  res.status(200).json({ received: true });

  const payload = req.body as AsaasWebhookPayload;

  try {
    const { event, payment } = payload;

    if (!payment) return;

    console.log(`📨 Asaas webhook: ${event} | payment=${payment.id} | status=${payment.status}`);

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        await handlePaymentConfirmed(payment);
        break;
      }

      case 'PAYMENT_OVERDUE': {
        await handlePaymentOverdue(payment);
        break;
      }

      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED': {
        await handlePaymentCancelled(payment);
        break;
      }

      default:
        console.log(`ℹ️  Asaas webhook ignorado: ${event}`);
    }
  } catch (err) {
    // Nunca devolver erro para o Asaas (já respondemos 200 acima)
    console.error('Erro ao processar webhook Asaas:', err);
  }
});

// ── Handlers internos ────────────────────────────────────────────────────────

async function handlePaymentConfirmed(payment: NonNullable<AsaasWebhookPayload['payment']>) {
  const tenantId = payment.externalReference;
  if (!tenantId) {
    console.warn('Webhook Asaas: pagamento sem externalReference (tenant_id)');
    return;
  }

  // Atualiza o tenant com o asaas_customer_id (caso ainda não tenha)
  await query(
    `UPDATE tenants
     SET asaas_customer_id = COALESCE(asaas_customer_id, $1), updated_at = NOW()
     WHERE id = $2`,
    [payment.customer, tenantId]
  );

  // Registra a transação financeira do pagamento recebido
  await query(
    `INSERT INTO financial_transactions
       (tenant_id, type, category, description, amount, payment_date, status, metadata)
     VALUES ($1, 'income', 'subscription', 'Pagamento plano - Asaas', $2, NOW(), 'paid', $3)
     ON CONFLICT DO NOTHING`,
    [
      tenantId,
      payment.netValue ?? payment.value,
      JSON.stringify({ asaas_payment_id: payment.id, billing_type: payment.billingType }),
    ]
  );

  console.log(`✅ Pagamento confirmado para tenant ${tenantId} — R$ ${payment.value}`);
}

async function handlePaymentOverdue(payment: NonNullable<AsaasWebhookPayload['payment']>) {
  const tenantId = payment.externalReference;
  if (!tenantId) return;

  // Aqui você pode, por exemplo, notificar o owner ou suspender o acesso
  console.warn(`⚠️  Pagamento vencido para tenant ${tenantId} | payment=${payment.id}`);

  // Exemplo: marcar tenant como inadimplente (adicione coluna se necessário)
  // await query(`UPDATE tenants SET subscription_status = 'overdue' WHERE id = $1`, [tenantId]);
}

async function handlePaymentCancelled(payment: NonNullable<AsaasWebhookPayload['payment']>) {
  const tenantId = payment.externalReference;
  if (!tenantId) return;

  console.log(`🗑️  Cobrança cancelada/reembolsada para tenant ${tenantId} | payment=${payment.id}`);
}

export default router;
