import QRCode from 'qrcode';
import { query, withTransaction } from '../config/database';
import { config } from '../config';
import { whatsappService } from './whatsapp.service';
import { PoolClient } from 'pg';

// ── QR Code: gera imagem PNG base64 a partir do token UUID ───────────────────
export async function generateQrImage(token: string): Promise<string> {
  // Payload é a URL pública de validação — abre no celular do segurança
  const payload = `${config.APP_PUBLIC_URL}/eventos/scan/${token}`;
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 400,
    margin: 2,
    color: { dark: '#111827', light: '#ffffff' },
  });
}

// Converte dataURL base64 → Buffer para envio via WhatsApp
function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  return Buffer.from(base64, 'base64');
}

// ── Disparar ingresso via WhatsApp ────────────────────────────────────────────
async function sendTicketWhatsApp(
  tenantId: string,
  phone: string,
  guestName: string,
  eventName: string,
  qrDataUrl: string
): Promise<void> {
  if (!config.EVOLUTION_API_KEY || !phone) return;

  try {
    const instanceRes = await query(
      `SELECT instance_name FROM whatsapp_instances
        WHERE tenant_id = $1 AND status = 'open' LIMIT 1`,
      [tenantId]
    );
    if (instanceRes.rows.length === 0) return;

    const instance = instanceRes.rows[0].instance_name;
    const clean    = phone.replace(/\D/g, '');
    const number   = clean.startsWith('55') ? clean : `55${clean}`;

    // 1. Mensagem de texto
    await whatsappService.sendMessage(
      instance,
      phone,
      `Olá *${guestName}*! 🎉\n\nSeu ingresso para *${eventName}* está confirmado!\n\nApresente o QR Code abaixo na portaria para realizar o check-in.\n\n_Este ingresso é pessoal e intransferível._`
    );

    // 2. Imagem do QR Code
    const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');

    const { default: axios } = await import('axios');
    await axios.post(
      `${config.EVOLUTION_API_URL}/message/sendMedia/${instance}`,
      {
        number,
        options: { delay: 1500 },
        mediaMessage: {
          mediatype: 'image',
          media:     base64,
          caption:   `🎫 Ingresso de ${guestName} — ${eventName}`,
          fileName:  'ingresso.png',
        },
      },
      { headers: { apikey: config.EVOLUTION_API_KEY, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[EventService] Falha ao enviar ingresso WA:', err);
  }
}

// ── Adicionar convidado + gerar QR + disparar WA ──────────────────────────────
export async function addGuest(
  tenantId: string,
  eventId: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    document?: string;
    ticket_type_id?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
    send_ticket?: boolean;  // se false, não dispara WA
  }
) {
  return withTransaction(async (client: PoolClient) => {
    // Verifica que o evento pertence ao tenant
    const evRes = await client.query(
      `SELECT id, name, status FROM events WHERE id = $1 AND tenant_id = $2`,
      [eventId, tenantId]
    );
    if (evRes.rows.length === 0) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }
    const event = evRes.rows[0];

    // Verifica capacidade do lote
    if (data.ticket_type_id) {
      const capRes = await client.query(
        `SELECT tt.capacity,
                COUNT(g.id) AS sold
           FROM event_ticket_types tt
           LEFT JOIN event_guests g ON g.ticket_type_id = tt.id
          WHERE tt.id = $1 AND tt.event_id = $2
          GROUP BY tt.capacity`,
        [data.ticket_type_id, eventId]
      );
      if (capRes.rows.length > 0) {
        const { capacity, sold } = capRes.rows[0];
        if (Number(sold) >= Number(capacity)) {
          throw Object.assign(new Error('Lote esgotado'), { statusCode: 422 });
        }
      }
    }

    const guestRes = await client.query(
      `INSERT INTO event_guests
         (event_id, ticket_type_id, name, email, phone, document, notes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        eventId,
        data.ticket_type_id ?? null,
        data.name,
        data.email ?? null,
        data.phone ?? null,
        data.document ?? null,
        data.notes ?? null,
        JSON.stringify(data.metadata ?? {}),
      ]
    );
    const guest = guestRes.rows[0];

    // Gera QR fora da transação para não atrasar o commit
    return { guest, eventName: event.name };
  }).then(async ({ guest, eventName }) => {
    // Gera imagem QR e dispara WA (fire-and-forget)
    const qrDataUrl = await generateQrImage(guest.qr_code_token);

    if (data.send_ticket !== false && data.phone) {
      sendTicketWhatsApp(tenantId, data.phone, data.name, eventName, qrDataUrl).then(() => {
        // Marca ticket como enviado
        query(
          `UPDATE event_guests SET ticket_sent_at = NOW() WHERE id = $1`,
          [guest.id]
        ).catch(() => {});
      });
    }

    return { ...guest, qr_data_url: qrDataUrl };
  });
}

// ── Reenviar ingresso WhatsApp ─────────────────────────────────────────────────
export async function resendTicket(tenantId: string, guestId: string) {
  const res = await query(
    `SELECT g.*, e.name AS event_name, e.tenant_id
       FROM event_guests g
       JOIN events e ON e.id = g.event_id
      WHERE g.id = $1 AND e.tenant_id = $2`,
    [guestId, tenantId]
  );
  if (res.rows.length === 0) throw Object.assign(new Error('Convidado não encontrado'), { statusCode: 404 });

  const guest = res.rows[0];
  if (!guest.phone) throw Object.assign(new Error('Convidado sem telefone cadastrado'), { statusCode: 422 });

  const qrDataUrl = await generateQrImage(guest.qr_code_token);
  await sendTicketWhatsApp(tenantId, guest.phone, guest.name, guest.event_name, qrDataUrl);
  await query(`UPDATE event_guests SET ticket_sent_at = NOW() WHERE id = $1`, [guestId]);

  return { ok: true, qr_data_url: qrDataUrl };
}

// ── MOTOR ANTI-FRAUDE: validar QR na portaria ─────────────────────────────────
export async function scanQr(
  token: string,
  eventId: string,
  operatorId?: string
): Promise<{
  status: 'OK' | 'ALREADY_USED' | 'WRONG_EVENT' | 'NOT_FOUND';
  guest?: Record<string, unknown>;
  ticket_type?: string;
}> {
  return withTransaction(async (client: PoolClient) => {
    // Lock na linha para evitar duplo check-in simultâneo (race condition)
    const guestRes = await client.query(
      `SELECT g.*, tt.name AS ticket_type_name
         FROM event_guests g
         LEFT JOIN event_ticket_types tt ON tt.id = g.ticket_type_id
        WHERE g.qr_code_token = $1
        FOR UPDATE OF g`,
      [token]
    );

    if (guestRes.rows.length === 0) return { status: 'NOT_FOUND' as const };

    const guest = guestRes.rows[0];

    // Token de outro evento
    if (guest.event_id !== eventId) {
      return { status: 'WRONG_EVENT' as const, guest };
    }

    // ── ALERTA VERMELHO: ingresso já utilizado ────────────────────────────────
    if (guest.check_in_status === true) {
      return {
        status: 'ALREADY_USED' as const,
        guest,
        ticket_type: guest.ticket_type_name,
      };
    }

    // ── ACESSO LIBERADO ───────────────────────────────────────────────────────
    const updated = await client.query(
      `UPDATE event_guests
         SET check_in_status = true,
             check_in_time   = NOW(),
             checked_in_by   = $1,
             updated_at      = NOW()
       WHERE id = $2
       RETURNING *`,
      [operatorId ?? null, guest.id]
    );

    return {
      status: 'OK' as const,
      guest: updated.rows[0],
      ticket_type: guest.ticket_type_name,
    };
  });
}

// ── Stats do evento (painel em tempo real) ─────────────────────────────────────
export async function getEventStats(eventId: string, tenantId: string) {
  const res = await query(
    `SELECT
       COUNT(g.id)                                            AS total_guests,
       COUNT(g.id) FILTER (WHERE g.check_in_status = true)   AS checked_in,
       COUNT(g.id) FILTER (WHERE g.check_in_status = false)  AS pending,
       COUNT(g.id) FILTER (WHERE g.ticket_sent_at IS NOT NULL) AS tickets_sent,
       COALESCE(SUM(tt.price), 0)                            AS total_revenue
     FROM events e
     LEFT JOIN event_guests g         ON g.event_id = e.id
     LEFT JOIN event_ticket_types tt  ON tt.id = g.ticket_type_id
    WHERE e.id = $1 AND e.tenant_id = $2`,
    [eventId, tenantId]
  );
  return res.rows[0];
}
