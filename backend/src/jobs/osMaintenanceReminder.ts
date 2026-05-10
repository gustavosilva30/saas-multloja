import cron from 'node-cron';
import { query } from '../config/database';
import { whatsappService } from '../services/whatsapp.service';
import { config } from '../config';

/**
 * Job diário: busca OS concluídas há ~6 meses e dispara lembrete de revisão
 * preventiva via WhatsApp para o cliente.
 *
 * Janela: completadas entre 180 e 182 dias atrás (evita reenvio no dia seguinte).
 */
async function runMaintenanceReminders() {
  if (!config.EVOLUTION_API_KEY) return; // WA não configurado, noop

  try {
    const result = await query(
      `SELECT
         so.id, so.os_number, so.tenant_id, so.asset_metadata,
         so.total,
         c.name    AS customer_name,
         c.phone   AS customer_phone,
         c.whatsapp AS customer_whatsapp,
         t.name    AS tenant_name
       FROM service_orders so
       LEFT JOIN customers c ON c.id = so.customer_id
       LEFT JOIN tenants   t ON t.id = so.tenant_id
      WHERE so.status = 'COMPLETED'
        AND so.completed_at >= NOW() - INTERVAL '182 days'
        AND so.completed_at <  NOW() - INTERVAL '180 days'
        AND c.phone IS NOT NULL`
    );

    console.log(`[MaintenanceJob] ${result.rows.length} OS encontradas para lembrete.`);

    for (const row of result.rows) {
      const phone = row.customer_whatsapp || row.customer_phone;
      if (!phone) continue;

      try {
        // Busca instância ativa do tenant
        const instanceRes = await query(
          `SELECT instance_name FROM whatsapp_instances
            WHERE tenant_id = $1 AND status = 'open'
            LIMIT 1`,
          [row.tenant_id]
        );
        if (instanceRes.rows.length === 0) continue;

        const instanceName = instanceRes.rows[0].instance_name;

        // Monta informação do ativo (ex: "Veículo ABC-1234")
        const asset = row.asset_metadata as Record<string, unknown>;
        const assetInfo = Object.entries(asset)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');

        const msg =
          `Olá${row.customer_name ? `, ${row.customer_name}` : ''}! 👋\n\n` +
          `Faz 6 meses que realizamos o serviço *OS-${row.os_number}*` +
          (assetInfo ? ` para o seu *${assetInfo}*` : '') + `.\n\n` +
          `🔧 Que tal agendar uma *revisão preventiva*? Manter a manutenção em dia evita problemas maiores!\n\n` +
          `Entre em contato conosco para agendar. — *${row.tenant_name}*`;

        await whatsappService.sendMessage(instanceName, phone, msg);
        console.log(`[MaintenanceJob] Lembrete enviado: OS-${row.os_number} → ${phone}`);
      } catch (err) {
        console.error(`[MaintenanceJob] Falha ao notificar OS-${row.os_number}:`, err);
      }
    }
  } catch (err) {
    console.error('[MaintenanceJob] Erro no job de manutenção preventiva:', err);
  }
}

export function startMaintenanceReminderJob() {
  // Roda todo dia às 09:00 (horário do servidor)
  cron.schedule('0 9 * * *', runMaintenanceReminders, {
    timezone: 'America/Sao_Paulo',
  });

  console.log('✅ Job de manutenção preventiva agendado (09:00 diário)');
}
