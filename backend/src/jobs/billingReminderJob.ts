import cron from 'node-cron';
import { query } from '../config/database';

async function runBillingReminders() {
  try {
    // Find all active billing rules
    const rules = await query(
      `SELECT br.*, t.id AS tenant_id
       FROM billing_rules br
       JOIN tenants t ON t.id = br.tenant_id
       WHERE br.is_active = true`
    );

    for (const rule of rules.rows) {
      // Target date: today + days_offset
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + rule.days_offset);
      const dateStr = targetDate.toISOString().slice(0, 10);

      // Find pending transactions due on that date with a customer contact
      const txns = await query(
        `SELECT ft.*, c.name AS contact_name, c.phone AS contact_phone
         FROM financial_transactions ft
         LEFT JOIN customers c ON c.id = ft.contact_id
         WHERE ft.tenant_id = $1
           AND ft.type      = 'income'
           AND ft.status    = 'pending'
           AND ft.due_date::date = $2
           AND c.phone IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM billing_rule_executions bre
             WHERE bre.billing_rule_id = $3
               AND bre.financial_transaction_id = ft.id
           )`,
        [rule.tenant_id, dateStr, rule.id]
      );

      if (!txns.rows.length) continue;

      // Get tenant's WhatsApp instance
      const waRes = await query(
        `SELECT instance_name FROM whatsapp_instances
         WHERE tenant_id = $1 AND status = 'open' LIMIT 1`,
        [rule.tenant_id]
      );
      if (!waRes.rows.length) continue;

      const instance = waRes.rows[0].instance_name;
      const waUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
      const waKey = process.env.EVOLUTION_API_KEY || '';

      for (const tx of txns.rows) {
        const daysLabel = rule.days_offset === 0
          ? 'hoje'
          : rule.days_offset > 0
            ? `há ${rule.days_offset} dia(s)`
            : `em ${Math.abs(rule.days_offset)} dia(s)`;

        const message = rule.message_template
          .replace(/\{\{name\}\}/g, tx.contact_name || 'Cliente')
          .replace(/\{\{amount\}\}/g, `R$ ${Number(tx.amount).toFixed(2).replace('.', ',')}`)
          .replace(/\{\{due_date\}\}/g, new Date(tx.due_date).toLocaleDateString('pt-BR'))
          .replace(/\{\{days\}\}/g, daysLabel)
          .replace(/\{\{description\}\}/g, tx.description || '');

        const phone = tx.contact_phone.replace(/\D/g, '');

        try {
          const resp = await fetch(`${waUrl}/message/sendText/${instance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: waKey },
            body: JSON.stringify({
              number: phone.startsWith('55') ? phone : `55${phone}`,
              text: message,
            }),
          });

          const status = resp.ok ? 'sent' : 'failed';
          const errorMessage = resp.ok ? null : await resp.text().catch(() => 'unknown');

          await query(
            `INSERT INTO billing_rule_executions
               (billing_rule_id, financial_transaction_id, channel, status, error_message)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (billing_rule_id, financial_transaction_id) DO NOTHING`,
            [rule.id, tx.id, rule.channel, status, errorMessage]
          );
        } catch (err: any) {
          await query(
            `INSERT INTO billing_rule_executions
               (billing_rule_id, financial_transaction_id, channel, status, error_message)
             VALUES ($1, $2, $3, 'failed', $4)
             ON CONFLICT (billing_rule_id, financial_transaction_id) DO NOTHING`,
            [rule.id, tx.id, rule.channel, err.message]
          );
        }
      }
    }
  } catch (err) {
    console.error('[BillingReminder] Error:', err);
  }
}

export function startBillingReminderJob() {
  // Runs daily at 08:00 BRT (UTC-3 = 11:00 UTC)
  cron.schedule('0 11 * * *', runBillingReminders, { timezone: 'America/Sao_Paulo' });
  console.log('✅ Billing reminder job scheduled (08:00 BRT daily)');
}
