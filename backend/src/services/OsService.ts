import { PoolClient } from 'pg';
import { query, withTransaction } from '../config/database';

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
    const lineTotal = it.quantity * it.unit_price;
    const disc = it.discount ?? 0;
    subtotal += lineTotal;
    totalDiscount += disc;
  }
  return { subtotal, discount: totalDiscount, total: subtotal - totalDiscount };
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
    items: OsItemInput[];
  }
) {
  return withTransaction(async (client: PoolClient) => {
    const { subtotal, discount, total } = calcTotals(data.items);

    // Auto-increment OS number per tenant (inside transaction = serializable)
    const osRes = await client.query(
      `INSERT INTO service_orders
         (tenant_id, customer_id, assignee_id, os_number,
          asset_metadata, expected_at, internal_notes, customer_notes,
          subtotal, discount, total)
       VALUES
         ($1, $2, $3, next_os_number($1),
          $4, $5, $6, $7,
          $8, $9, $10)
       RETURNING *`,
      [
        tenantId,
        data.customer_id ?? null,
        data.assignee_id ?? null,
        JSON.stringify(data.asset_metadata ?? {}),
        data.expected_at ?? null,
        data.internal_notes ?? null,
        data.customer_notes ?? null,
        subtotal,
        discount,
        total,
      ]
    );
    const os = osRes.rows[0];

    // Insert items
    for (const it of data.items) {
      await client.query(
        `INSERT INTO service_order_items
           (os_id, item_type, product_id, technician_id, description,
            quantity, unit_price, discount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          os.id,
          it.item_type,
          it.product_id ?? null,
          it.technician_id ?? null,
          it.description,
          it.quantity,
          it.unit_price,
          it.discount ?? 0,
        ]
      );
    }

    // Record status history
    await client.query(
      `INSERT INTO service_order_status_history (os_id, changed_by, from_status, to_status)
       VALUES ($1, $2, NULL, 'DRAFT')`,
      [os.id, userId]
    );

    return os;
  });
}

// ── Update status (with stock deduction on COMPLETED) ─────────────────────────

export async function updateOsStatus(
  osId: string,
  tenantId: string,
  userId: string,
  newStatus: OsStatus,
  note?: string
) {
  return withTransaction(async (client: PoolClient) => {
    // Lock the OS row to prevent race conditions
    const osRes = await client.query(
      `SELECT id, tenant_id, status FROM service_orders
       WHERE id = $1 AND tenant_id = $2
       FOR UPDATE`,
      [osId, tenantId]
    );

    if (osRes.rows.length === 0) {
      throw Object.assign(new Error('OS not found'), { statusCode: 404 });
    }

    const os = osRes.rows[0];
    const oldStatus = os.status as OsStatus;

    if (oldStatus === newStatus) {
      throw Object.assign(new Error('Status unchanged'), { statusCode: 400 });
    }

    // Prevent re-opening a completed/canceled OS
    if (oldStatus === 'COMPLETED' || oldStatus === 'CANCELED') {
      throw Object.assign(
        new Error(`Cannot transition from ${oldStatus}`),
        { statusCode: 422 }
      );
    }

    // ── Stock deduction when transitioning to COMPLETED ───────────────────────
    if (newStatus === 'COMPLETED') {
      const itemsRes = await client.query(
        `SELECT id, product_id, quantity
         FROM service_order_items
         WHERE os_id = $1
           AND item_type = 'PRODUCT'
           AND stock_deducted = false
           AND product_id IS NOT NULL`,
        [osId]
      );

      for (const item of itemsRes.rows) {
        // Deduct stock — enforce non-negative to catch insufficient stock
        const stockRes = await client.query(
          `UPDATE products
           SET stock_quantity = stock_quantity - $1,
               updated_at     = NOW()
           WHERE id = $2 AND tenant_id = $3
             AND stock_quantity >= $1
           RETURNING id, name, stock_quantity`,
          [item.quantity, item.product_id, tenantId]
        );

        if (stockRes.rows.length === 0) {
          // Check if product exists or stock insufficient
          const prodRes = await client.query(
            `SELECT name, stock_quantity FROM products WHERE id = $1`,
            [item.product_id]
          );
          const prod = prodRes.rows[0];
          throw Object.assign(
            new Error(
              prod
                ? `Estoque insuficiente: "${prod.name}" tem apenas ${prod.stock_quantity} unidades`
                : `Produto ${item.product_id} não encontrado`
            ),
            { statusCode: 422 }
          );
        }

        // Mark item as deducted (idempotency guard)
        await client.query(
          `UPDATE service_order_items SET stock_deducted = true WHERE id = $1`,
          [item.id]
        );
      }

      // Set completion timestamp
      await client.query(
        `UPDATE service_orders
         SET status = $1, completed_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [newStatus, osId]
      );
    } else if (newStatus === 'IN_PROGRESS' && oldStatus === 'APPROVED') {
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

    // Record status change
    await client.query(
      `INSERT INTO service_order_status_history
         (os_id, changed_by, from_status, to_status, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [osId, userId, oldStatus, newStatus, note ?? null]
    );

    const updated = await client.query(
      'SELECT * FROM service_orders WHERE id = $1',
      [osId]
    );
    return updated.rows[0];
  });
}

// ── Get OS with items ─────────────────────────────────────────────────────────

export async function getOsDetail(osId: string, tenantId: string) {
  const [osRes, itemsRes, historyRes] = await Promise.all([
    query(
      `SELECT so.*,
              c.name       AS customer_name,
              c.phone      AS customer_phone,
              u.full_name  AS assignee_name
       FROM service_orders so
       LEFT JOIN customers     c ON c.id = so.customer_id
       LEFT JOIN user_profiles u ON u.id = so.assignee_id
       WHERE so.id = $1 AND so.tenant_id = $2`,
      [osId, tenantId]
    ),
    query(
      `SELECT soi.*,
              p.name  AS product_name,
              p.sku   AS product_sku,
              u.full_name AS technician_name
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

  return {
    ...osRes.rows[0],
    items: itemsRes.rows,
    history: historyRes.rows,
  };
}

// ── Update OS fields (before COMPLETED/CANCELED) ──────────────────────────────

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

    const addField = (col: string, val: unknown) => {
      fields.push(`${col} = $${i++}`);
      vals.push(val);
    };

    if (data.customer_id !== undefined) addField('customer_id', data.customer_id);
    if (data.assignee_id !== undefined) addField('assignee_id', data.assignee_id);
    if (data.asset_metadata !== undefined) addField('asset_metadata', JSON.stringify(data.asset_metadata));
    if (data.expected_at !== undefined) addField('expected_at', data.expected_at);
    if (data.internal_notes !== undefined) addField('internal_notes', data.internal_notes);
    if (data.customer_notes !== undefined) addField('customer_notes', data.customer_notes);

    // Replace items if provided
    if (data.items) {
      await client.query(`DELETE FROM service_order_items WHERE os_id = $1`, [osId]);

      for (const it of data.items) {
        await client.query(
          `INSERT INTO service_order_items
             (os_id, item_type, product_id, technician_id, description,
              quantity, unit_price, discount)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            osId, it.item_type, it.product_id ?? null, it.technician_id ?? null,
            it.description, it.quantity, it.unit_price, it.discount ?? 0,
          ]
        );
      }

      const { subtotal, discount, total } = calcTotals(data.items);
      addField('subtotal', subtotal);
      addField('discount', discount);
      addField('total', total);
    }

    if (fields.length > 0) {
      vals.push(osId);
      await client.query(
        `UPDATE service_orders SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i}`,
        vals
      );
    }

    const updated = await client.query('SELECT * FROM service_orders WHERE id = $1', [osId]);
    return updated.rows[0];
  });
}
