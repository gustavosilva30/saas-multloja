import { PoolClient } from 'pg';
import { pool } from './database';

// =============================================================================
// 🔒 C4 — Tenant-scoped database connection
// =============================================================================
// Cada chamada do withTenantContext:
//   1. checkout de um client do pool
//   2. BEGIN
//   3. SET LOCAL app.tenant_id = '<uuid>'  (vive só nesta tx)
//   4. executa o callback (todas as queries do client veem só esse tenant via RLS)
//   5. COMMIT — ou ROLLBACK se o callback lançar
//   6. release do client SEMPRE (mesmo em erro)
// =============================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Executa um callback dentro de uma transação com `app.tenant_id` setado.
 * Toda query que usar o `client` passado verá apenas linhas do tenant indicado,
 * graças às policies de Row-Level Security ativadas em `11_rls_policies.sql`.
 *
 * O `tenantId` deve sempre vir do JWT validado pelo middleware de auth — NUNCA
 * de input do usuário. A validação de formato UUID aqui é defesa adicional.
 */
export async function withTenantContext<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  // Defesa em profundidade: rejeita qualquer string que não seja UUID válido
  // antes de tocar no banco. Impede SQL injection caso tenantId seja
  // acidentalmente uma string controlada por atacante.
  if (!tenantId || !UUID_RE.test(tenantId)) {
    throw Object.assign(new Error('tenantId inválido em withTenantContext'), { statusCode: 500 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // SET LOCAL — automaticamente revertido no fim da transação.
    // Usamos set_config(name, value, is_local) para passar o UUID como
    // parâmetro ($1) ao invés de interpolar (mesmo já validado, é mais limpo).
    await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);

    const result = await fn(client);

    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore — conexão pode estar suja */ }
    throw err;
  } finally {
    client.release();
  }
}
