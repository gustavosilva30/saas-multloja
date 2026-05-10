import { query } from '../config/database';

const httpError = (msg: string, statusCode = 404) =>
  Object.assign(new Error(msg), { statusCode });

/**
 * Verifica se um registro de uma tabela pertence ao tenant.
 * Usado para travar IDOR em payloads que carregam FKs (bank_account_id, contact_id, etc).
 */
export async function assertTenantOwnership(
  table: string,
  id: string,
  tenantId: string,
  label = 'recurso',
  extraWhere = ''
): Promise<void> {
  // table e extraWhere são literais controlados pelo desenvolvedor — nunca user input.
  const sql = `SELECT 1 FROM ${table} WHERE id = $1 AND tenant_id = $2 ${extraWhere} LIMIT 1`;
  const r = await query(sql, [id, tenantId]);
  if (!r.rows.length) throw httpError(`${label} não encontrado ou não pertence a este tenant`, 404);
}

/**
 * Valida vários IDs em batch — retorna erro se algum não pertencer ao tenant.
 */
export async function assertTenantOwnsAll(
  table: string,
  ids: string[],
  tenantId: string,
  label = 'recursos'
): Promise<void> {
  if (!ids.length) return;
  const r = await query(
    `SELECT id FROM ${table} WHERE id = ANY($1) AND tenant_id = $2`,
    [ids, tenantId]
  );
  if (r.rows.length !== ids.length) {
    throw httpError(`${label}: um ou mais IDs não pertencem ao tenant`, 404);
  }
}

/**
 * Valida que um membro pertence a um grupo familiar específico do tenant.
 */
export async function assertGroupMember(
  memberId: string,
  groupId: string,
  tenantId: string,
  label = 'membro'
): Promise<void> {
  const r = await query(
    `SELECT 1 FROM family_members
       WHERE id = $1 AND group_id = $2 AND tenant_id = $3 AND is_active = true LIMIT 1`,
    [memberId, groupId, tenantId]
  );
  if (!r.rows.length) throw httpError(`${label} não pertence a este grupo`, 404);
}

/**
 * Valida que TODOS os member IDs pertencem ao grupo + tenant.
 */
export async function assertAllGroupMembers(
  memberIds: string[],
  groupId: string,
  tenantId: string
): Promise<void> {
  if (!memberIds.length) return;
  const r = await query(
    `SELECT id FROM family_members
       WHERE id = ANY($1) AND group_id = $2 AND tenant_id = $3 AND is_active = true`,
    [memberIds, groupId, tenantId]
  );
  if (r.rows.length !== memberIds.length) {
    throw httpError('Um ou mais membros do split não pertencem a este grupo', 400);
  }
}
