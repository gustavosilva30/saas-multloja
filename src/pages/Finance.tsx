import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Wallet, ArrowUpRight, ArrowDownRight,
  BarChart3, Upload, CheckCircle, AlertCircle, X,
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';
const getToken = () => localStorage.getItem('auth_token') || '';

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function useApi<T>(path: string, deps: any[] = []) {
  const token = getToken();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await r.json();
      setData(json);
    } catch { setError('Falha ao carregar'); }
    finally { setLoading(false); }
  }, [path, token]);

  useEffect(() => { load(); }, deps);

  return { data, loading, error, reload: load };
}

// ── Modal de Nova Transação ───────────────────────────────────────────────────
interface Account { id: string; name: string; current_balance: number; color: string; }
interface ChartAccount { id: string; name: string; code: string; type: string; }
interface CostCenter { id: string; name: string; }

function NewTransactionModal({
  onClose, onSaved, accounts, chartAccounts, costCenters,
}: {
  onClose: () => void;
  onSaved: () => void;
  accounts: Account[];
  chartAccounts: ChartAccount[];
  costCenters: CostCenter[];
}) {
  const token = getToken();
  const [form, setForm] = useState({
    type: 'income' as 'income' | 'expense',
    description: '',
    amount: '',
    due_date: new Date().toISOString().slice(0, 10),
    status: 'pending',
    bank_account_id: '',
    chart_of_account_id: '',
    cost_center_id: '',
    installments: '1',
    recurrent: false,
    recurrent_months: '12',
    tags: '',
    category: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const body: any = {
        type: form.type,
        description: form.description,
        amount: parseFloat(form.amount),
        due_date: form.due_date,
        status: form.status,
        bank_account_id: form.bank_account_id || undefined,
        chart_of_account_id: form.chart_of_account_id || undefined,
        cost_center_id: form.cost_center_id || undefined,
        installments: parseInt(form.installments),
        recurrent: form.recurrent,
        recurrent_months: form.recurrent ? parseInt(form.recurrent_months) : undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        category: form.category || undefined,
      };
      const r = await fetch(`${API}/api/finance/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Erro ao salvar');
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h3 className="text-white font-bold text-lg">Nova Transação</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            {(['income', 'expense'] as const).map(t => (
              <button
                key={t} type="button"
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  form.type === t
                    ? t === 'income' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-red-500 text-white border-red-500'
                    : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                {t === 'income' ? 'Receita' : 'Despesa'}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Descrição *</label>
            <input
              required value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
              placeholder="Ex: Aluguel, Venda de produto..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Valor (R$) *</label>
              <input
                required type="number" step="0.01" min="0.01" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Vencimento *</label>
              <input
                required type="date" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
              >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Conta Bancária</label>
              <select
                value={form.bank_account_id}
                onChange={e => setForm(f => ({ ...f, bank_account_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
              >
                <option value="">Sem conta</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Plano de Contas</label>
              <select
                value={form.chart_of_account_id}
                onChange={e => setForm(f => ({ ...f, chart_of_account_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
              >
                <option value="">Sem categoria</option>
                {chartAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Centro de Custo</label>
              <select
                value={form.cost_center_id}
                onChange={e => setForm(f => ({ ...f, cost_center_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
              >
                <option value="">Nenhum</option>
                {costCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Parcelas</label>
              <input
                type="number" min="1" max="60" value={form.installments}
                onChange={e => setForm(f => ({ ...f, installments: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Tags (vírgula)</label>
              <input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
                placeholder="marketing, fixo..."
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox" checked={form.recurrent}
              onChange={e => setForm(f => ({ ...f, recurrent: e.target.checked }))}
              className="accent-emerald-500"
            />
            <span className="text-sm text-zinc-300">Lançamento recorrente</span>
          </label>

          {form.recurrent && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Repetir por (meses)</label>
              <input
                type="number" min="1" max="60" value={form.recurrent_months}
                onChange={e => setForm(f => ({ ...f, recurrent_months: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
              />
            </div>
          )}

          {err && <p className="text-red-400 text-sm">{err}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-semibold hover:bg-zinc-800">
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal de Pay ──────────────────────────────────────────────────────────────
function PayModal({
  txId, onClose, onPaid, accounts,
}: { txId: string; onClose: () => void; onPaid: () => void; accounts: Account[] }) {
  const token = getToken();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState('');
  const [saving, setSaving] = useState(false);

  async function pay() {
    setSaving(true);
    try {
      await fetch(`${API}/api/finance/transactions/${txId}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payment_date: date, bank_account_id: accountId || undefined }),
      });
      onPaid();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-white font-bold">Confirmar Pagamento</h3>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Data do Pagamento</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Conta Bancária</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none">
            <option value="">Manter atual</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-semibold">Cancelar</button>
          <button onClick={pay} disabled={saving} className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Salvando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── OFX Import Modal ──────────────────────────────────────────────────────────
function OfxModal({ accounts, onClose, onImported, token }: {
  accounts: Account[]; onClose: () => void; onImported: () => void; token: string;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number; total_parsed: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function doImport() {
    if (!file || !accountId) return;
    setLoading(true); setErr('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch(`${API}/api/finance/bank-accounts/${accountId}/import-ofx`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Erro ao importar');
      setResult(json);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold">Importar Extrato OFX</h3>
          <button onClick={onClose}><X size={18} className="text-zinc-400" /></button>
        </div>
        {!result ? (
          <>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Conta Bancária</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none">
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Arquivo OFX</label>
              <input type="file" accept=".ofx,.OFX" onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-zinc-300 file:bg-zinc-700 file:border-0 file:text-white file:rounded-lg file:px-3 file:py-1.5 file:text-xs file:cursor-pointer" />
            </div>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-semibold">Cancelar</button>
              <button onClick={doImport} disabled={loading || !file}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50">
                {loading ? 'Importando…' : 'Importar'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center space-y-3">
            <CheckCircle size={48} className="text-emerald-400 mx-auto" />
            <p className="text-white font-bold">Importação concluída!</p>
            <p className="text-zinc-400 text-sm">{result.imported} importadas · {result.skipped} duplicatas ignoradas</p>
            <button onClick={() => { onImported(); onClose(); }}
              className="w-full py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DRE Modal ─────────────────────────────────────────────────────────────────
function DreModal({ onClose, token }: { onClose: () => void; token: string }) {
  const now = new Date();
  const [startDate, setStartDate] = useState(`${now.getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(now.toISOString().slice(0, 10));
  const [dre, setDre] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch(`${API}/api/finance/reports/dre?start_date=${startDate}&end_date=${endDate}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setDre(await r.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h3 className="text-white font-bold text-lg">DRE — Demonstrativo de Resultado</h3>
          <button onClick={onClose}><X size={20} className="text-zinc-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Início</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Fim</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
            </div>
            <button onClick={load} className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              {loading ? '…' : 'Gerar'}
            </button>
          </div>

          {dre && (
            <div className="space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-emerald-400 text-sm font-semibold mb-2">RECEITAS</p>
                {dre.revenues.map((r: any) => (
                  <div key={r.code} className="flex justify-between py-0.5">
                    <span className="text-zinc-300 text-sm">{r.code} — {r.name}</span>
                    <span className="text-emerald-400 text-sm font-mono">{fmt(Number(r.balance))}</span>
                  </div>
                ))}
                <div className="border-t border-emerald-500/30 mt-2 pt-2 flex justify-between">
                  <span className="text-white font-bold text-sm">Total Receitas</span>
                  <span className="text-emerald-400 font-bold">{fmt(dre.total_revenue)}</span>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400 text-sm font-semibold mb-2">DESPESAS</p>
                {dre.expenses.map((r: any) => (
                  <div key={r.code} className="flex justify-between py-0.5">
                    <span className="text-zinc-300 text-sm">{r.code} — {r.name}</span>
                    <span className="text-red-400 text-sm font-mono">{fmt(Math.abs(Number(r.balance)))}</span>
                  </div>
                ))}
                <div className="border-t border-red-500/30 mt-2 pt-2 flex justify-between">
                  <span className="text-white font-bold text-sm">Total Despesas</span>
                  <span className="text-red-400 font-bold">{fmt(dre.total_expense)}</span>
                </div>
              </div>

              <div className={`rounded-xl p-4 border ${dre.net_result >= 0 ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">Resultado Líquido</span>
                  <span className={`text-2xl font-black ${dre.net_result >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt(dre.net_result)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Finance Page ─────────────────────────────────────────────────────────
export function Finance() {
  const token = getToken();
  const [tab, setTab] = useState<'transactions' | 'accounts' | 'billing'>('transactions');
  const [showNewTx, setShowNewTx] = useState(false);
  const [showOfx, setShowOfx] = useState(false);
  const [showDre, setShowDre] = useState(false);
  const [payTxId, setPayTxId] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState({ type: '', status: '', start_date: '', end_date: '' });
  const [txPage, setTxPage] = useState(1);

  const { data: summary, reload: reloadSummary } = useApi<any>('/api/finance/reports/summary');
  const { data: cashFlowData, reload: reloadCF } = useApi<any>('/api/finance/reports/cash-flow');
  const { data: accountsData, reload: reloadAccounts } = useApi<any>('/api/finance/bank-accounts');
  const { data: coaData } = useApi<any>('/api/finance/chart-of-accounts');
  const { data: ccData } = useApi<any>('/api/finance/cost-centers');
  const { data: billingData, reload: reloadBilling } = useApi<any>('/api/finance/billing-rules');

  const accounts: Account[] = accountsData?.accounts || [];
  const chartAccounts: ChartAccount[] = coaData?.accounts || [];
  const costCenters: CostCenter[] = ccData?.cost_centers || [];

  const txQuery = new URLSearchParams({
    page: String(txPage),
    limit: '20',
    ...(txFilter.type && { type: txFilter.type }),
    ...(txFilter.status && { status: txFilter.status }),
    ...(txFilter.start_date && { start_date: txFilter.start_date }),
    ...(txFilter.end_date && { end_date: txFilter.end_date }),
  }).toString();

  const { data: txData, reload: reloadTx } = useApi<any>(`/api/finance/transactions?${txQuery}`, [txPage, txFilter]);

  function reloadAll() {
    reloadSummary(); reloadCF(); reloadAccounts(); reloadTx();
  }

  const transactions = txData?.transactions || [];
  const cashFlow = cashFlowData?.cash_flow || [];
  const billingRules = billingData?.rules || [];

  const totalBalance = summary?.total_balance ?? 0;
  const monthIncome = Number(summary?.month?.total_income || 0);
  const monthExpense = Number(summary?.month?.total_expense || 0);
  const overdueCount = Number(summary?.overdue?.count || 0);
  const overdueTotal = Number(summary?.overdue?.total || 0);

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Financeiro</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Controle completo do fluxo de caixa e resultados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowDre(true)}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-sm font-semibold"
          >
            <BarChart3 size={16} /> DRE
          </button>
          <button
            onClick={() => setShowOfx(true)}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-sm font-semibold"
          >
            <Upload size={16} /> Importar OFX
          </button>
          <button
            onClick={() => setShowNewTx(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"
          >
            <Plus size={16} /> Nova Transação
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-emerald-400" />
            <span className="text-xs text-zinc-500">Saldo Total</span>
          </div>
          <div className="text-2xl font-black dark:text-white">{fmt(totalBalance)}</div>
          <p className="text-xs text-zinc-400 mt-1">{accounts.length} conta(s) ativa(s)</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight size={16} className="text-emerald-400" />
            <span className="text-xs text-zinc-500">Receitas (mês)</span>
          </div>
          <div className="text-2xl font-black text-emerald-400">{fmt(monthIncome)}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight size={16} className="text-red-400" />
            <span className="text-xs text-zinc-500">Despesas (mês)</span>
          </div>
          <div className="text-2xl font-black text-red-400">{fmt(monthExpense)}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-yellow-400" />
            <span className="text-xs text-zinc-500">Em Atraso</span>
          </div>
          <div className="text-2xl font-black text-yellow-400">{fmt(overdueTotal)}</div>
          <p className="text-xs text-zinc-400 mt-1">{overdueCount} lançamento(s)</p>
        </div>
      </div>

      {/* Cash Flow Chart */}
      {cashFlow.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <h3 className="font-semibold dark:text-white mb-4">Fluxo de Caixa Mensal</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 12 }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                  formatter={(v: any) => [fmt(Number(v)), '']}
                />
                <Legend />
                <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-800/50 p-1 rounded-xl w-fit">
        {(['transactions', 'accounts', 'billing'] as const).map(t => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t === 'transactions' ? 'Lançamentos' : t === 'accounts' ? 'Contas' : 'Réguas de Cobrança'}
          </button>
        ))}
      </div>

      {/* Tab: Transactions */}
      {tab === 'transactions' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={txFilter.type}
              onChange={e => { setTxFilter(f => ({ ...f, type: e.target.value })); setTxPage(1); }}
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none"
            >
              <option value="">Todos os tipos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
            </select>
            <select
              value={txFilter.status}
              onChange={e => { setTxFilter(f => ({ ...f, status: e.target.value })); setTxPage(1); }}
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none"
            >
              <option value="">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
            </select>
            <input
              type="date" value={txFilter.start_date}
              onChange={e => { setTxFilter(f => ({ ...f, start_date: e.target.value })); setTxPage(1); }}
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none"
            />
            <input
              type="date" value={txFilter.end_date}
              onChange={e => { setTxFilter(f => ({ ...f, end_date: e.target.value })); setTxPage(1); }}
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none"
            />
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="text-left px-4 py-3 font-medium">Descrição</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Categoria</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Vencimento</th>
                    <th className="text-right px-4 py-3 font-medium">Valor</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">Nenhum lançamento encontrado</td></tr>
                  ) : transactions.map((tx: any) => {
                    const isIncome = tx.type === 'income';
                    const overdue = tx.status === 'pending' && new Date(tx.due_date) < new Date();
                    return (
                      <tr key={tx.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isIncome ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            <span className="text-zinc-200 truncate max-w-[160px]">{tx.description}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-zinc-400 text-xs">
                          {tx.chart_of_account_name || '—'}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`text-xs ${overdue ? 'text-red-400 font-semibold' : 'text-zinc-400'}`}>
                            {new Date(tx.due_date).toLocaleDateString('pt-BR')}
                            {overdue && ' ⚠'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          <span className={isIncome ? 'text-emerald-400' : 'text-red-400'}>
                            {isIncome ? '+' : '-'}{fmt(Number(tx.amount))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tx.status === 'paid' ? (
                            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">Pago</span>
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${overdue ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                              {overdue ? 'Vencido' : 'Pendente'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tx.status !== 'paid' && (
                            <button
                              onClick={() => setPayTxId(tx.id)}
                              className="text-xs bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 px-2 py-1 rounded-lg font-semibold"
                            >
                              Baixar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {txData && txData.total > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                <span className="text-xs text-zinc-400">{txData.total} lançamentos</span>
                <div className="flex gap-2">
                  <button disabled={txPage === 1} onClick={() => setTxPage(p => p - 1)}
                    className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs disabled:opacity-40">
                    Anterior
                  </button>
                  <button disabled={txPage * 20 >= txData.total} onClick={() => setTxPage(p => p + 1)}
                    className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs disabled:opacity-40">
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Accounts */}
      {tab === 'accounts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc: any) => (
            <div key={acc.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: acc.color }} />
                  <span className="text-white font-semibold text-sm">{acc.name}</span>
                </div>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{acc.type}</span>
              </div>
              {acc.bank_name && <p className="text-xs text-zinc-500 mb-3">{acc.bank_name}</p>}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Saldo inicial</span>
                  <span>{fmt(Number(acc.initial_balance))}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Movimentos pagos</span>
                  <span className={Number(acc.movements) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {fmt(Number(acc.movements))}
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-zinc-800">
                  <span className="text-white text-sm">Saldo atual</span>
                  <span className={`text-sm ${Number(acc.current_balance) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt(Number(acc.current_balance))}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="col-span-3 text-center py-12 text-zinc-500">
              Nenhuma conta bancária cadastrada.
            </div>
          )}
        </div>
      )}

      {/* Tab: Billing Rules */}
      {tab === 'billing' && (
        <div className="space-y-3">
          {billingRules.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              Nenhuma régua de cobrança configurada.
            </div>
          ) : billingRules.map((rule: any) => (
            <div key={rule.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start gap-4">
              <div className={`w-2 h-2 rounded-full mt-1.5 ${rule.is_active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-semibold text-sm">{rule.name}</span>
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{rule.channel}</span>
                </div>
                <p className="text-xs text-zinc-400 mb-1">
                  {rule.days_offset === 0 ? 'No dia do vencimento'
                    : rule.days_offset < 0 ? `${Math.abs(rule.days_offset)} dia(s) antes do vencimento`
                    : `${rule.days_offset} dia(s) após o vencimento`}
                </p>
                <p className="text-xs text-zinc-500 italic truncate">{rule.message_template}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showNewTx && (
        <NewTransactionModal
          onClose={() => setShowNewTx(false)}
          onSaved={() => { setShowNewTx(false); reloadAll(); }}
          accounts={accounts}
          chartAccounts={chartAccounts}
          costCenters={costCenters}
        />
      )}
      {showOfx && (
        <OfxModal
          accounts={accounts}
          onClose={() => setShowOfx(false)}
          onImported={reloadAll}
          token={token || ''}
        />
      )}
      {showDre && <DreModal onClose={() => setShowDre(false)} token={token || ''} />}
      {payTxId && (
        <PayModal
          txId={payTxId}
          onClose={() => setPayTxId(null)}
          onPaid={() => { setPayTxId(null); reloadAll(); }}
          accounts={accounts}
        />
      )}
    </div>
  );
}
