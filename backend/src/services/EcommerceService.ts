import axios from 'axios';
import { query } from '../config/database';

/**
 * Sincroniza o estoque local com o Mercado Livre
 * Sempre que o estoque muda no sistema, avisamos o ML.
 */
export async function syncStockToML(tenantId: string, productId: string, newStock: number): Promise<void> {
  try {
    // 1. Buscar todos os anúncios vinculados a este produto
    const itemsRes = await query(
      `SELECT ml_item_id, ml_user_id 
       FROM mercadolivre_items 
       WHERE product_id = $1 AND tenant_id = $2`,
      [productId, tenantId]
    );

    if (itemsRes.rows.length === 0) return;

    for (const item of itemsRes.rows) {
      // 2. Buscar o token de acesso da conta dona do anúncio
      const accountRes = await query(
        `SELECT access_token FROM mercadolivre_accounts 
         WHERE ml_user_id = $1 AND tenant_id = $2 AND is_active = true`,
        [item.ml_user_id, tenantId]
      );

      if (accountRes.rows.length === 0) continue;
      const { access_token } = accountRes.rows[0];

      // 3. Atualizar estoque no Mercado Livre
      try {
        await axios.put(
          `https://api.mercadolibre.com/items/${item.ml_item_id}`,
          { available_quantity: Math.max(0, newStock) },
          { headers: { Authorization: `Bearer ${access_token}` } }
        );
        
        // Atualizar meta-dados locais
        await query(
          `UPDATE mercadolivre_items SET ml_stock = $1, last_sync_at = NOW() 
           WHERE ml_item_id = $2 AND tenant_id = $3`,
          [newStock, item.ml_item_id, tenantId]
        );
        
        console.log(`ML Sync Success: Item ${item.ml_item_id} updated to ${newStock}`);
      } catch (err: any) {
        console.error(`ML Sync Failed for item ${item.ml_item_id}:`, err.response?.data || err.message);
      }
    }
  } catch (err) {
    console.error('Error in syncStockToML:', err);
  }
}
