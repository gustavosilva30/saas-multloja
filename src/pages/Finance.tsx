import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Wallet, ArrowUpRight, ArrowDownRight, BarChart3,
  Upload, CheckCircle, AlertCircle, X, TrendingUp, Building2,
  ChevronRight, Circle,
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';
const getToken = () => localStorage.getItem('auth_token') || '';
const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function useApi<T>(path: string, deps: any[] = []) {
  const token = getToken();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      setData(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [path, token]);

  useEffect(() => { load(); }, deps);
  return { data, loading, reload: load };
}

// ── Shared input style ────────────────────────────────────────────────────────
const inp = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 placeholder:text-slate-400';
const sel = inp + ' cursor-pointer';

// ── Label ─────────────────────────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
    {children}
  </label>
);

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ status, overdue }: { status: string; overdue: boolean }) {
  if (status === 'paid')
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Pago</span>;
  if (overdue)
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">Vencido</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">Pendente</span>;
}

// ── Modal Shell ───────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, children, maxW = 'max-w-lg' }: {
  title: string; onClose: () => void; children: React.ReactNode; maxW?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-2xl shadow-2xl shadow-slate-900/10 w-full ${maxW} max-h-[92vh] overflow-y-auto border border-slate-100`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-slate-800 font-bold text-base tracking-tight">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Nova Transação ────────────────────────────────────────────────────────────
interface Account { id: string; name: string; current_balance: number; color: string; }
interface ChartAccount { id: string; name: string; code: string; type: string; }
interface CostCenter { id: string; name: string; }

function NewTransactionModal({ onClose, onSaved, accounts, chartAccounts, costCenters }: {
  onClose: () => void; onSaved: () => void;
  accounts: Account[]; chartAccounts: ChartAccount[]; costCenters: CostCenter[];
}) {
  const token = getToken();
  const [form, setForm] = useState({
    type: 'income' as 'income' | 'expense',
    description: '', amount: '',
    due_date: new Date().toISOString().slice(0, 10),
    status: 'pending', bank_account_id: '',
    chart_of_account_id: '', cost_center_id: '',
    installments: '1', recurrent: false, recurrent_months: '12', tags: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    try {
      const body: any = {
        type: form.type, description: form.description,
        amount: parseFloat(form.amount), due_date: form.due_date, status: form.status,
        bank_account_id: form.bank_account_id || undefined,
        chart_of_account_id: form.chart_of_account_id || undefined,
        cost_center_id: form.cost_center_id || undefined,
        installments: parseInt(form.installments),
        recurrent: form.recurrent,
        recurrent_months: form.recurrent ? parseInt(form.recurrent_months) : undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      const r = await fetch(`${API}/api/finance/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Erro ao salvar');
      onSaved();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <ModalShell title="Nova Transação" onClose={onClose}>
      <form onSubmit={submit} className="px-6 py-5 space-y-5">

        {/* Type Toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          {(['income', 'expense'] as const).map(t => (
            <button key={t} type="button"
              onClick={() => set('type', t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                form.type === t
                  ? t === 'income'
                    ? 'bg-white shadow-sm text-emerald-700 ring-1 ring-slate-200'
                    : 'bg-white shadow-sm text-red-600 ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'income' ? '↑ Receita' : '↓ Despesa'}
            </button>
          ))}
        </div>

        {/* Descrição */}
        <div>
          <Label>Descrição *</Label>
          <input required value={form.description} onChange={e => set('description', e.target.value)}
            className={inp} placeholder="Ex: Aluguel, Venda de produto, Comissão…" />
        </div>

        {/* Valor + Vencimento */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Valor (R$) *</Label>
            <input required type="number" step="0.01" min="0.01" value={form.amount}
              onChange={e => set('amount', e.target.value)} className={inp} placeholder="0,00" />
          </div>
          <div>
            <Label>Vencimento *</Label>
            <input required type="date" value={form.due_date}
              onChange={e => set('due_date', e.target.value)} className={inp} />
          </div>
        </div>

        {/* Status + Conta */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Status</Label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={sel}>
              <option value="pending">Pendente</option>
              <option value="paid">Pago / Recebido</option>
            </select>
          </div>
          <div>
            <Label>Conta Bancária</Label>
            <select value={form.bank_account_id} onChange={e => set('bank_account_id', e.target.value)} className={sel}>
              <option value="">Sem conta</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        {/* Plano + Centro de Custo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Plano de Contas</Label>
            <select value={form.chart_of_account_id} onChange={e => set('chart_of_account_id', e.target.value)} className={sel}>
              <option value="">Sem categoria</option>
              {chartAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Centro de Custo</Label>
            <select value={form.cost_center_id} onChange={e => set('cost_center_id', e.target.value)} className={sel}>
              <option value="">Nenhum</option>
              {costCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Parcelas + Tags */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Parcelas</Label>
            <input type="number" min="1" max="60" value={form.installments}
              onChange={e => set('installments', e.target.value)} className={inp} />
          </div>
          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)}
              className={inp} placeholder="marketing, fixo…" />
          </div>
        </div>

        {/* Recorrente */}
        <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => set('recurrent', !form.recurrent)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.recurrent ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-all ${form.recurrent ? 'left-5' : 'left-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-slate-700">Lançamento recorrente</span>
          </label>
          {form.recurrent && (
            <div>
              <Label>Repetir por (meses)</Label>
              <input type="number" min="1" max="60" value={form.recurrent_months}
                onChange={e => set('recurrent_months', e.target.value)} className={inp} />
            </div>
          )}
        </div>

        {err && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
            <AlertCircle size={14} /> {err}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm">
            {saving ? 'Salvando…' : 'Salvar Lançamento'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── Pay Modal ─────────────────────────────────────────────────────────────────
function PayModal({ txId, onClose, onPaid, accounts }: {
  txId: string; onClose: () => void; onPaid: () => void; accounts: Account[];
}) {
  const token = getToken();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState('');
  const [saving, setSaving] = useState(false);

  async function pay() {
    setSaving(true);
    await fetch(`${API}/api/finance/transactions/${txId}/pay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ payment_date: date, bank_account_id: accountId || undefined }),
    });
    setSaving(false); onPaid();
  }

  return (
    <ModalShell title="Confirmar Baixa" onClose={onClose} maxW="max-w-sm">
      <div className="px-6 py-5 space-y-4">
        <div>
          <Label>Data do Pagamento</Label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
        </div>
        <div>
          <Label>Conta Bancária</Label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className={sel}>
            <option value="">Manter atual</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancelar</button>
          <button onClick={pay} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50">
            {saving ? 'Salvando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ── OFX Modal ─────────────────────────────────────────────────────────────────
function OfxModal({ accounts, onClose, onImported }: {
  accounts: Account[]; onClose: () => void; onImported: () => void;
}) {
  const token = getToken();
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function doImport() {
    if (!file || !accountId) return;
    setLoading(true); setErr('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch(`${API}/api/finance/bank-accounts/${accountId}/import-ofx`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Erro ao importar');
      setResult(json);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title="Importar Extrato OFX" onClose={onClose} maxW="max-w-sm">
      <div className="px-6 py-5 space-y-4">
        {!result ? (
          <>
            <div>
              <Label>Conta Bancária</Label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} className={sel}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Arquivo .OFX</Label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl px-4 py-6 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                <Upload size={20} className="text-slate-400 mb-2" />
                <span className="text-sm text-slate-500">{file ? file.name : 'Clique para selecionar o arquivo'}</span>
                <input type="file" accept=".ofx,.OFX" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            {err && <p className="text-red-600 text-sm">{err}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancelar</button>
              <button onClick={doImport} disabled={loading || !file}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50">
                {loading ? 'Importando…' : 'Importar'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-emerald-600" />
            </div>
            <p className="text-slate-800 font-bold text-base">Importação concluída</p>
            <p className="text-slate-500 text-sm">{result.imported} transações importadas · {result.skipped} duplicatas ignoradas</p>
            <button onClick={() => { onImported(); onClose(); }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold">
              Fechar
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ── DRE Modal ─────────────────────────────────────────────────────────────────
function DreModal({ onClose }: { onClose: () => void }) {
  const token = getToken();
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
    setDre(await r.json()); setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <ModalShell title="DRE — Demonstrativo de Resultado" onClose={onClose} maxW="max-w-2xl">
      <div className="px-6 py-5 space-y-5">
        <div className="flex gap-3 items-end">
          <div className="flex-1"><Label>Período início</Label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inp} /></div>
          <div className="flex-1"><Label>Período fim</Label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inp} /></div>
          <button onClick={load} disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors">
            {loading ? '…' : 'Gerar'}
          </button>
        </div>

        {dre && (
          <div className="space-y-3">
            {/* Receitas */}
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <div className="bg-emerald-50 px-4 py-2.5 flex justify-between items-center border-b border-slate-100">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Receitas</span>
                <span className="text-sm font-bold text-emerald-700">{fmt(dre.total_revenue)}</span>
              </div>
              {dre.revenues.map((r: any) => (
                <div key={r.code} className="flex justify-between px-4 py-2 hover:bg-slate-50 border-b border-slate-50">
                  <span className="text-sm text-slate-600">{r.code} — {r.name}</span>
                  <span className="text-sm font-mono text-slate-800">{fmt(Number(r.balance))}</span>
                </div>
              ))}
            </div>

            {/* Despesas */}
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <div className="bg-red-50 px-4 py-2.5 flex justify-between items-center border-b border-slate-100">
                <span className="text-xs font-bold text-red-700 uppercase tracking-widest">Despesas</span>
                <span className="text-sm font-bold text-red-700">{fmt(dre.total_expense)}</span>
              </div>
              {dre.expenses.map((r: any) => (
                <div key={r.code} className="flex justify-between px-4 py-2 hover:bg-slate-50 border-b border-slate-50">
                  <span className="text-sm text-slate-600">{r.code} — {r.name}</span>
                  <span className="text-sm font-mono text-slate-800">{fmt(Math.abs(Number(r.balance)))}</span>
                </div>
              ))}
            </div>

            {/* Resultado */}
            <div className={`rounded-xl border px-5 py-4 flex justify-between items-center ${dre.net_result >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <span className="font-bold text-slate-800">Resultado Líquido</span>
              <span className={`text-2xl font-black tracking-tight ${dre.net_result >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {fmt(dre.net_result)}
              </span>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ── Custom Tooltip para gráfico ───────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: {fmt(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

// ── Main Finance Page ─────────────────────────────────────────────────────────
export function Finance() {
  const [tab, setTab] = useState<'transactions' | 'accounts' | 'billing'>('transactions');
  const [showNewTx, setShowNewTx] = useState(false);
  const [showOfx, setShowOfx] = useState(false);
  const [showDre, setShowDre] = useState(false);
  const [payTxId, setPayTxId] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState({ type: '', status: '', start_date: '', end_date: '' });
  const [txPage, setTxPage] = useState(1);

  const { data: summary, reload: reloadSummary } = useApi<any>('/api/finance/reports/summary');
  const { data: cashFlowData } = useApi<any>('/api/finance/reports/cash-flow');
  const { data: accountsData, reload: reloadAccounts } = useApi<any>('/api/finance/bank-accounts');
  const { data: coaData } = useApi<any>('/api/finance/chart-of-accounts');
  const { data: ccData } = useApi<any>('/api/finance/cost-centers');
  const { data: billingData } = useApi<any>('/api/finance/billing-rules');

  const accounts: Account[] = accountsData?.accounts || [];
  const chartAccounts: ChartAccount[] = coaData?.accounts || [];
  const costCenters: CostCenter[] = ccData?.cost_centers || [];
  const cashFlow = cashFlowData?.cash_flow || [];
  const billingRules = billingData?.rules || [];

  const txQuery = new URLSearchParams({
    page: String(txPage), limit: '20',
    ...(txFilter.type && { type: txFilter.type }),
    ...(txFilter.status && { status: txFilter.status }),
    ...(txFilter.start_date && { start_date: txFilter.start_date }),
    ...(txFilter.end_date && { end_date: txFilter.end_date }),
  }).toString();

  const { data: txData, reload: reloadTx } = useApi<any>(`/api/finance/transactions?${txQuery}`, [txPage, txFilter]);
  const transactions = txData?.transactions || [];

  function reloadAll() { reloadSummary(); reloadAccounts(); reloadTx(); }

  const totalBalance = summary?.total_balance ?? 0;
  const monthIncome  = Number(summary?.month?.total_income  || 0);
  const monthExpense = Number(summary?.month?.total_expense || 0);
  const overdueCount = Number(summary?.overdue?.count || 0);
  const overdueTotal = Number(summary?.overdue?.total || 0);

  return (
    <div className="min-h-full bg-slate-50/60 space-y-6 pb-8">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financeiro</h1>
          <p className="text-sm text-slate-500 mt-0.5">Controle completo do fluxo de caixa e resultados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowDre(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors">
            <BarChart3 size={15} /> DRE
          </button>
          <button onClick={() => setShowOfx(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors">
            <Upload size={15} /> Importar OFX
          </button>
          <button onClick={() => setShowNewTx(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors">
            <Plus size={15} /> Nova Transação
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Total */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Saldo Total</span>
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Wallet size={15} className="text-slate-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{fmt(totalBalance)}</div>
          <p className="text-xs text-slate-400 mt-1.5">{accounts.length} conta(s) ativa(s)</p>
        </div>

        {/* Receitas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Receitas / Mês</span>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <ArrowUpRight size={15} className="text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">{fmt(monthIncome)}</div>
          <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
            <TrendingUp size={11} /> Mês atual
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Despesas / Mês</span>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <ArrowDownRight size={15} className="text-red-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-500 tracking-tight">{fmt(monthExpense)}</div>
          <div className="mt-1.5 text-xs text-slate-400">Mês atual</div>
        </div>

        {/* Em Atraso */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Em Atraso</span>
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <AlertCircle size={15} className="text-amber-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 tracking-tight">{fmt(overdueTotal)}</div>
          <p className="text-xs text-slate-400 mt-1.5">{overdueCount} lançamento(s) vencido(s)</p>
        </div>
      </div>

      {/* ── Cash Flow Chart ── */}
      {cashFlow.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-800 tracking-tight">Fluxo de Caixa</h3>
              <p className="text-xs text-slate-400 mt-0.5">Receitas × Despesas mensais</p>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlow} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="income"  name="Receitas" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-0 bg-white border border-slate-200 shadow-sm rounded-xl p-1 w-fit">
        {(['transactions', 'accounts', 'billing'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t === 'transactions' ? 'Lançamentos' : t === 'accounts' ? 'Contas' : 'Réguas de Cobrança'}
          </button>
        ))}
      </div>

      {/* ── Tab: Lançamentos ── */}
      {tab === 'transactions' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {[
              { val: txFilter.type, key: 'type', opts: [['','Todos os tipos'],['income','Receitas'],['expense','Despesas']] },
              { val: txFilter.status, key: 'status', opts: [['','Todos os status'],['pending','Pendente'],['paid','Pago']] },
            ].map(({ val, key, opts }) => (
              <select key={key} value={val}
                onChange={e => { setTxFilter(f => ({ ...f, [key]: e.target.value })); setTxPage(1); }}
                className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none shadow-sm hover:border-slate-300 transition-colors">
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            <input type="date" value={txFilter.start_date}
              onChange={e => { setTxFilter(f => ({ ...f, start_date: e.target.value })); setTxPage(1); }}
              className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none shadow-sm" />
            <input type="date" value={txFilter.end_date}
              onChange={e => { setTxFilter(f => ({ ...f, end_date: e.target.value })); setTxPage(1); }}
              className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none shadow-sm" />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Descrição', 'Categoria', 'Vencimento', 'Valor', 'Status', ''].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-left font-semibold text-xs text-slate-400 uppercase tracking-widest ${
                      h === 'Categoria' ? 'hidden md:table-cell' : h === 'Vencimento' ? 'hidden sm:table-cell' :
                      h === 'Valor' ? 'text-right' : h === 'Status' ? 'text-center' : ''
                    }`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Circle size={32} strokeWidth={1} />
                        <p className="text-sm">Nenhum lançamento encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : transactions.map((tx: any) => {
                  const isIncome = tx.type === 'income';
                  const overdue  = tx.status === 'pending' && new Date(tx.due_date) < new Date();
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isIncome ? 'bg-emerald-500' : 'bg-red-400'}`} />
                          <span className="text-slate-700 font-medium truncate max-w-[180px]">{tx.description}</span>
                          {tx.installment_total > 1 && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              {tx.installment_number}/{tx.installment_total}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {tx.chart_of_account_name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-slate-500'}`}>
                          {new Date(tx.due_date).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`font-bold font-mono text-sm ${isIncome ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {isIncome ? '+' : '-'}{fmt(Number(tx.amount))}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge status={tx.status} overdue={overdue} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {tx.status !== 'paid' && (
                          <button
                            onClick={() => setPayTxId(tx.id)}
                            className="opacity-0 group-hover:opacity-100 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all"
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

            {/* Pagination */}
            {txData && txData.total > 20 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs text-slate-400 font-medium">{txData.total} lançamentos</span>
                <div className="flex gap-1.5">
                  <button disabled={txPage === 1} onClick={() => setTxPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 transition-colors">
                    ← Anterior
                  </button>
                  <button disabled={txPage * 20 >= txData.total} onClick={() => setTxPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 transition-colors">
                    Próximo →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Contas ── */}
      {tab === 'accounts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.length === 0 ? (
            <div className="col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
              <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Nenhuma conta bancária cadastrada.</p>
            </div>
          ) : accounts.map((acc: any) => (
            <div key={acc.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: acc.color }} />
                  <div>
                    <p className="text-slate-800 font-bold text-sm">{acc.name}</p>
                    {acc.bank_name && <p className="text-xs text-slate-400">{acc.bank_name}</p>}
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{acc.type}</span>
              </div>
              <div className="space-y-1.5 pt-3 border-t border-slate-50">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Saldo inicial</span>
                  <span className="font-mono">{fmt(Number(acc.initial_balance))}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Movimentação</span>
                  <span className={`font-mono font-semibold ${Number(acc.movements) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {fmt(Number(acc.movements))}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-700">Saldo atual</span>
                  <span className={`text-sm font-black font-mono ${Number(acc.current_balance) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {fmt(Number(acc.current_balance))}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Réguas ── */}
      {tab === 'billing' && (
        <div className="space-y-2">
          {billingRules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
              <p className="text-slate-400 text-sm">Nenhuma régua de cobrança configurada.</p>
            </div>
          ) : billingRules.map((rule: any) => (
            <div key={rule.id} className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4 flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${rule.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-slate-800 font-semibold text-sm">{rule.name}</span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">{rule.channel}</span>
                  {!rule.is_active && <span className="text-xs text-slate-400">(inativa)</span>}
                </div>
                <p className="text-xs text-slate-500 mb-1">
                  {rule.days_offset === 0 ? 'No dia do vencimento'
                    : rule.days_offset < 0 ? `${Math.abs(rule.days_offset)} dia(s) antes do vencimento`
                    : `${rule.days_offset} dia(s) após o vencimento`}
                </p>
                <p className="text-xs text-slate-400 italic truncate max-w-lg">{rule.message_template}</p>
              </div>
              <ChevronRight size={14} className="text-slate-300 mt-1 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showNewTx && (
        <NewTransactionModal
          onClose={() => setShowNewTx(false)}
          onSaved={() => { setShowNewTx(false); reloadAll(); }}
          accounts={accounts} chartAccounts={chartAccounts} costCenters={costCenters}
        />
      )}
      {showOfx && <OfxModal accounts={accounts} onClose={() => setShowOfx(false)} onImported={reloadAll} />}
      {showDre && <DreModal onClose={() => setShowDre(false)} />}
      {payTxId && (
        <PayModal txId={payTxId} onClose={() => setPayTxId(null)}
          onPaid={() => { setPayTxId(null); reloadAll(); }} accounts={accounts} />
      )}
    </div>
  );
}
