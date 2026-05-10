import cron from 'node-cron';
import { query } from '../config/database';
import { sendDailyAgenda } from '../services/FamilyService';

async function runFamilyAgenda() {
  try {
    // Busca todos os grupos com WhatsApp configurado
    const groups = await query(
      `SELECT id, tenant_id FROM family_groups WHERE whatsapp_group_id IS NOT NULL`
    );
    for (const g of groups.rows) {
      await sendDailyAgenda(g.id, g.tenant_id).catch(err =>
        console.error(`[FamilyAgenda] grupo ${g.id}:`, err.message)
      );
    }
  } catch (err) {
    console.error('[FamilyAgenda] Erro geral:', err);
  }
}

export function startFamilyAgendaJob() {
  // Toda manhã às 07:30 BRT (10:30 UTC)
  cron.schedule('30 10 * * *', runFamilyAgenda, { timezone: 'America/Sao_Paulo' });
  console.log('✅ Family agenda job scheduled (07:30 BRT daily)');
}
