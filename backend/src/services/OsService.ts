import { PoolClient } from 'pg';
import { query, withTransaction } from '../config/database';
import { config } from '../config';
import { whatsappService } from './whatsapp.service';

export type OsStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'WAITING_PARTS'
  | 'COMPLETED'
  | 'CANCELED';

export type OsItemType = 'PRODUCT' | 'SERVICE';

export interface OsItemInput {
  item_type: OsItemType;
  product_id?: string;
  technician_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcTotals(items: OsItemInput[]) {
  let subtotal = 0;
  let totalDiscount = 0;
  for (const it of items) {
    subtotal     += it.quantity * it.unit_price;
    totalDiscount += it.discount ?? 0;
  }
  return { subtotal, discount: totalDiscount, total: subtotal - totalDiscount };
}

function publicOsUrl(token: string) {
  return `${config.APP_PUBLIC_URL}/os/view/${token}`;
}

// ── Motor de Kits: injeta produtos atrelados a serviços ───────────────────────
// Para cada item SERVICE com product_id, busca os bundles cadastrados e
// acrescenta os produtos correspondentes na lista antes de salvar na OS.
async function injectBundleProducts(
  tenantId: string,
  items: OsItemInput[],
  client: PoolClient
): Promise<OsItemInput[]> {
  const expanded: OsItemInput[] = [];

  for (const item of items) {
    expanded.push(item);

    if (item.item_type === 'SERVICE' && item.product_id) {
      const bundleRes = await client.query(
        `SELECT spb.default_quantity, spb.product_id,
                p.name, p.sale_price
           FROM service_product_bundles spb
           JOIN products p ON p.id = spb.product_id
          WHERE spb.tenant_id = $1
            AND spb.service_product_id = $2
            AND spb.is_active = true`,
        [tenantId, item.product_id]
      );

      for (const bundle of bundleRes.rows) {
        expanded.push({
          item_type:  'PRODUCT',
          product_id: bundle.product_id,
          description: bundle.name,
          quantity:    bundle.default_quantity,
          unit_price:  bundle.sale_price,
          discount:    0,
        });
      }
    }
  }

  return expanded;
}

// ── WhatsApp: dispara notificações fora da transação (fire-and-forget) ─────────
async function notifyWhatsApp(
  tenantId: string,
  customerPhone: string | null | undefined,
  message: string
): Promise<void> {
  if (!customerPhone || !config.EVOLUTION_API_KEY) return;

  try {
    const instanceRes = await query(
      `SELECT instance_name FROM whatsapp_instances
        WHERE tenant_id = $1 AND status = 'open'
        LIMIT 1`,
      [tenantId]
    );
    if (instanceRes.rows.length === 0) return;

    const instanceName = instanceRes.rows[0].instance_name;
    await whatsappService.sendMessage(instanceName, customerPhone, message);
  } catch (err) {
    // Falha de WA nunca deve bloquear a OS
    console.error('WhatsApp notification error:', err);
  }
}

// ── Create OS ─────────────────────────────────────────────────────────────────

export async function createOs(
  tenantId: string,
  userId: string,
  data: {
    customer_id?: string;
    assignee_id?: string;
    asset_metadata?: Record<string, unknown>;
    expected_at?: string;
    internal_notes?: string;
    customer_notes?: string;
    guest_name?: string;
    guest_phone?: string;
    guest_document?: string;
    guest_address?: string;
    items: OsItemInput[];
  }
) {
  return withTransaction(async (client: PoolClient) => {
    // Expande serviços com kits antes de calcular totais
    const items = await injectBundleProducts(tenantId, data.items, client);
    const { subtotal, discount, total } = calcTotals(items);

    const osRes = await client.query(
      `INSERT INTO service_orders
         (tenant_id, customer_id, assignee_id, os_number,
          asset_metadata, expected_at, internal_notes, customer_notes,
          subtotal, discount, total,
          guest_name, guest_phone, guest_document, guest_address)
       VALUES
         ($1, $2, $3, next_os_number($1),
          $4, $5, $6, $7,
          $8, $9, $10,
          $11, $12, $13, $14)
       RETURNING *`,
      [
        tenantId,
        data.customer_id ?? null,
        data.assignee_id ?? null,
        JSON.stringify(data.asset_metadata ?? {}),
        data.expected_at ?? null,
        data.internal_notes ?? null,
        data.customer_notes ?? null,
        subtotal, discount, total,
        data.guest_name ?? null,
        data.guest_phone ?? null,
        data.guest_document ?? null,
        data.guest_address ?? null,
      ]
    );
    const os = osRes.rows[0];

    for (const it of items) {
      await client.query(
        `INSERT INTO service_order_items
           (os_id, item_type, product_id, technician_id, description,
            quantity, unit_price, discount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          os.id, it.item_type, it.product_id ?? null,
          it.technician_id ?? null, it.description,
          it.quantity, it.unit_price, it.discount ?? 0,
        ]
      );
    }

    await client.query(
      `INSERT INTO service_order_status_history (os_id, changed_by, from_status, to_status)
       VALUES ($1, $2, NULL, 'DRAFT')`,
      [os.id, userId]
    );

    return os;
  });
}

// ── Update OS fields ──────────────────────────────────────────────────────────

export async function updateOs(
  osId: string,
  tenantId: string,
  data: {
    customer_id?: string;
    assignee_id?: string;
    asset_metadata?: Record<string, unknown>;
    expected_at?: string;
    internal_notes?: string;
    customer_notes?: string;
    guest_name?: string;
    guest_phone?: string;
    guest_document?: string;
    guest_address?: string;
    items?: OsItemInput[];
  }
) {
  return withTransaction(async (client: PoolClient) => {
    const osRes = await client.query(
      `SELECT status FROM service_orders WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [osId, tenantId]
    );
    if (osRes.rows.length === 0) throw Object.assign(new Error('OS not found'), { statusCode: 404 });

    const { status } = osRes.rows[0];
    if (status === 'COMPLETED' || status === 'CANCELED') {
      throw Object.assign(new Error('Cannot edit a closed OS'), { statusCode: 422 });
    }

    const fields: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    const addField = (col: string, val: unknown) => { fields.push(`${col} = $${i++}`); vals.push(val); };

    if (data.customer_id   !== undefined) addField('customer_id',   data.customer_id);
    if (data.assignee_id   !== undefined) addField('assignee_id',   data.assignee_id);
    if (data.asset_metadata !== undefined) addField('asset_metadata', JSON.stringify(data.asset_metadata));
    if (data.expected_at   !== undefined) addField('expected_at',   data.expected_at);
    if (data.internal_notes !== undefined) addField('internal_notes', data.internal_notes);
    if (data.customer_notes !== undefined) addField('customer_notes', data.customer_notes);
    if (data.guest_name     !== undefined) addField('guest_name',     data.guest_name);
    if (data.guest_phone    !== undefined) addField('guest_phone',    data.guest_phone);
    if (data.guest_document !== undefined) addField('guest_document', data.guest_document);
    if (data.guest_address  !== undefined) addField('guest_address',  data.guest_address);

    if (data.items) {
      await client.query(`DELETE FROM service_order_items WHERE os_id = $1`, [osId]);

      // Expande kits ao editar também
      const items = await injectBundleProducts(tenantId, data.items, client);

      for (const it of items) {
        await client.query(
          `INSERT INTO service_order_items
             (os_id, item_type, product_id, technician_id, description,
              quantity, unit_price, discount)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            osId, it.item_type, it.product_id ?? null,
            it.technician_id ?? null, it.description,
            it.quantity, it.unit_price, it.discount ?? 0,
          ]
        );
      }

      const { subtotal, discount, total } = calcTotals(items);
      addField('subtotal', subtotal);
      addField('discount', discount);
      addField('total',    total);
    }

    if (fields.length > 0) {
      vals.push(osId);
      await client.query(
        `UPDATE service_orders SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i}`,
        vals
      );
    }

    return (await client.query('SELECT * FROM service_orders WHERE id = $1', [osId])).rows[0];
  });
}

// ── Update status ─────────────────────────────────────────────────────────────

export async function updateOsStatus(
  osId: string,
  tenantId: string,
  userId: string,
  newStatus: OsStatus,
  note?: string
) {
  // Snapshot de dados para notificação WA (buscado antes da transação)
  let customerPhone: string | null = null;
  let customerName: string | null  = null;
  let accessToken: string | null   = null;
  let osNumber: number | null      = null;
  let osTotal: number | null       = null;

  const result = await withTransaction(async (client: PoolClient) => {
    const osRes = await client.query(
      `SELECT so.id, so.tenant_id, so.status, so.os_number, so.total, so.access_token,
              COALESCE(c.phone, so.guest_phone) AS customer_phone, 
              COALESCE(c.whatsapp, so.guest_phone) AS customer_whatsapp, 
              COALESCE(c.name, so.guest_name) AS customer_name
         FROM service_orders so
         LEFT JOIN customers c ON c.id = so.customer_id
        WHERE so.id = $1 AND so.tenant_id = $2
        FOR UPDATE OF so`,
      [osId, tenantId]
    );

    if (osRes.rows.length === 0) throw Object.assign(new Error('OS not found'), { statusCode: 404 });

    const os = osRes.rows[0];
    const oldStatus = os.status as OsStatus;

    if (oldStatus === newStatus) throw Object.assign(new Error('Status unchanged'), { statusCode: 400 });
    if (oldStatus === 'COMPLETED' || oldStatus === 'CANCELED') {
      throw Object.assign(new Error(`Cannot transition from ${oldStatus}`), { statusCode: 422 });
    }

    // Snapshot para uso no WA (após commit)
    customerPhone = os.customer_whatsapp || os.customer_phone;
    customerName  = os.customer_name;
    accessToken   = os.access_token;
    osNumber      = os.os_number;
    osTotal       = os.total;

    // ── Baixa de estoque ao COMPLETAR ────────────────────────────────────────
    if (newStatus === 'COMPLETED') {
      const itemsRes = await client.query(
        `SELECT id, product_id, quantity
           FROM service_order_items
          WHERE os_id = $1 AND item_type = 'PRODUCT'
            AND stock_deducted = false AND product_id IS NOT NULL`,
        [osId]
      );

      for (const item of itemsRes.rows) {
        const stockRes = await client.query(
          `UPDATE products
             SET stock_quantity = stock_quantity - $1, updated_at = NOW()
           WHERE id = $2 AND tenant_id = $3 AND stock_quantity >= $1
           RETURNING id`,
          [item.quantity, item.product_id, tenantId]
        );

        if (stockRes.rows.length === 0) {
          const prod = await client.query(
            `SELECT name, stock_quantity FROM products WHERE id = $1`,
            [item.product_id]
          );
          const p = prod.rows[0];
          throw Object.assign(
            new Error(
              p
                ? `Estoque insuficiente: "${p.name}" (${p.stock_quantity} disponível)`
                : `Produto ${item.product_id} não encontrado`
            ),
            { statusCode: 422 }
          );
        }

        await client.query(
          `UPDATE service_order_items SET stock_deducted = true WHERE id = $1`,
          [item.id]
        );
      }

      await client.query(
        `UPDATE service_orders
           SET status = $1, completed_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [newStatus, osId]
      );
    } else if (newStatus === 'IN_PROGRESS') {
      await client.query(
        `UPDATE service_orders
           SET status = $1, started_at = COALESCE(started_at, NOW()), updated_at = NOW()
         WHERE id = $2`,
        [newStatus, osId]
      );
    } else {
      await client.query(
        `UPDATE service_orders SET status = $1, updated_at = NOW() WHERE id = $2`,
        [newStatus, osId]
      );
    }

    await client.query(
      `INSERT INTO service_order_status_history
         (os_id, changed_by, from_status, to_status, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [osId, userId, oldStatus, newStatus, note ?? null]
    );

    return (await client.query('SELECT * FROM service_orders WHERE id = $1', [osId])).rows[0];
  });

  // ── WhatsApp: fire-and-forget APÓS o commit ───────────────────────────────
  if (newStatus === 'PENDING_APPROVAL' && accessToken) {
    const link = publicOsUrl(accessToken);
    notifyWhatsApp(
      tenantId,
      customerPhone,
      `Olá${customerName ? `, ${customerName}` : ''}! 👋\n\n` +
      `Sua Ordem de Serviço *OS-${osNumber}* foi criada e aguarda sua aprovação.\n\n` +
      `📋 Acesse o link abaixo para ver os detalhes e aprovar:\n${link}`
    );
  }

  if (newStatus === 'COMPLETED') {
    const valor = Number(osTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    notifyWhatsApp(
      tenantId,
      customerPhone,
      `Olá${customerName ? `, ${customerName}` : ''}! ✅\n\n` +
      `Sua Ordem de Serviço *OS-${osNumber}* foi *concluída* e está pronta para retirada!\n\n` +
      `💰 Valor total: *${valor}*\n\n` +
      `Aguardamos sua visita. Obrigado pela preferência! 🙏`
    );
  }

  return result;
}

// ── Get OS detail ─────────────────────────────────────────────────────────────

export async function getOsDetail(osId: string, tenantId: string) {
  const [osRes, itemsRes, historyRes] = await Promise.all([
    query(
      `SELECT so.*,
              c.name      AS customer_name,
              c.phone     AS customer_phone,
              c.whatsapp  AS customer_whatsapp,
              u.full_name AS assignee_name
         FROM service_orders so
         LEFT JOIN customers     c ON c.id = so.customer_id
         LEFT JOIN user_profiles u ON u.id = so.assignee_id
        WHERE so.id = $1 AND so.tenant_id = $2`,
      [osId, tenantId]
    ),
    query(
      `SELECT soi.*,
              p.name       AS product_name,
              p.sku        AS product_sku,
              u.full_name  AS technician_name
         FROM service_order_items soi
         LEFT JOIN products       p ON p.id = soi.product_id
         LEFT JOIN user_profiles  u ON u.id = soi.technician_id
        WHERE soi.os_id = $1
        ORDER BY soi.created_at`,
      [osId]
    ),
    query(
      `SELECT h.*, u.full_name AS changed_by_name
         FROM service_order_status_history h
         LEFT JOIN user_profiles u ON u.id = h.changed_by
        WHERE h.os_id = $1
        ORDER BY h.changed_at`,
      [osId]
    ),
  ]);

  if (osRes.rows.length === 0) return null;
  return { ...osRes.rows[0], items: itemsRes.rows, history: historyRes.rows };
}
