// ─────────────────────────────────────────────────────────────────────────────
// Validators centralizados — protegem o domínio contra entradas inválidas.
// Lance erros com `statusCode` para que o errorHandler responda 400.
// ─────────────────────────────────────────────────────────────────────────────

interface MoneyOpts {
  min?: number;        // default 0.01
  max?: number;        // default 9_999_999.99
  field?: string;      // nome do campo para mensagem de erro
  allowZero?: boolean; // default false
}

const httpError = (msg: string, statusCode = 400) =>
  Object.assign(new Error(msg), { statusCode });

/**
 * Converte valor monetário do request, garantindo finitude, sinal e range.
 * Sempre retorna número arredondado a 2 casas.
 */
export function parseMoney(v: unknown, opts: MoneyOpts = {}): number {
  const min = opts.allowZero ? 0 : (opts.min ?? 0.01);
  const max = opts.max ?? 9_999_999.99;
  const field = opts.field ?? 'valor';

  if (v === null || v === undefined || v === '') {
    throw httpError(`${field} é obrigatório`);
  }
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  if (!Number.isFinite(n)) throw httpError(`${field} inválido`);
  if (n < min) throw httpError(`${field} deve ser maior ou igual a ${min}`);
  if (n > max) throw httpError(`${field} excede o limite permitido (${max})`);
  return Math.round(n * 100) / 100;
}

/**
 * Inteiro positivo dentro de range. Útil para parcelas, pontos, quantidades.
 */
export function parseInteger(v: unknown, opts: { min?: number; max?: number; field?: string } = {}): number {
  const min = opts.min ?? 1;
  const max = opts.max ?? 1_000_000;
  const field = opts.field ?? 'número';
  const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw httpError(`${field} deve ser inteiro`);
  if (n < min || n > max) throw httpError(`${field} fora do range (${min}–${max})`);
  return n;
}

/**
 * Valida string contra whitelist de valores permitidos (enum SQL).
 */
export function parseEnum<T extends string>(v: unknown, allowed: readonly T[], field = 'valor'): T {
  if (typeof v !== 'string' || !allowed.includes(v as T)) {
    throw httpError(`${field} inválido. Permitidos: ${allowed.join(', ')}`);
  }
  return v as T;
}

/**
 * Valida data ISO YYYY-MM-DD (opcionalmente com hora).
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
export function parseISODate(v: unknown, field = 'data'): string {
  if (typeof v !== 'string' || !ISO_DATE.test(v)) throw httpError(`${field} inválida (use YYYY-MM-DD)`);
  const d = new Date(v);
  if (isNaN(d.getTime())) throw httpError(`${field} inválida`);
  return v;
}

/**
 * Valida UUID v4 (formato).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseUUID(v: unknown, field = 'id'): string {
  if (typeof v !== 'string' || !UUID.test(v)) throw httpError(`${field} inválido`);
  return v;
}

/**
 * Versão opcional — retorna undefined se vazio, valida se vier algo.
 */
export function optionalUUID(v: unknown, field = 'id'): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  return parseUUID(v, field);
}
