import { useState, useEffect, useRef } from 'react';
import {
  Wrench, Plus, Search, Clock, CheckCircle2, AlertCircle, XCircle,
  Calendar, User, DollarSign, ExternalLink, Loader2, Edit2,
  X, Package, ChevronDown, Trash2, PlusCircle, Tag,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';

type OSStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'CANCELED';
type ItemType = 'SERVICE' | 'PRODUCT';

interface ServiceOrder {
  id: string;
  os_number: number;
  status: OSStatus;
  total: string;
  expected_at: string | null;
  created_at: string;
  customer_name: string | null;
  assignee_name: string | null;
  asset_metadata: Record<string, string>;
}

interface Stats {
  total: number;
  draft: number;
  in_progress: number;
  waiting_parts: number;
  completed: number;
  canceled: number;
  revenue_completed: number;
}

interface OsItem {
  item_type: ItemType;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  sale_price: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

const STATUS_CONFIG: Record<OSStatus, { label: string; color: string; icon: any }> = {
  DRAFT:            { label: 'Rascunho',           color: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700', icon: Clock },
  PENDING_APPROVAL: { label: 'Aguard. Aprovação',  color: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', icon: AlertCircle },
  APPROVED:         { label: 'Aprovado',            color: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', icon: CheckCircle2 },
  IN_PROGRESS:      { label: 'Em Execução',         color: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800', icon: Wrench },
  WAITING_PARTS:    { label: 'Aguard. Peças',       color: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800', icon: Clock },
  COMPLETED:        { label: 'Concluído',           color: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', icon: CheckCircle2 },
  CANCELED:         { label: 'Cancelado',           color: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800', icon: XCircle },
};

const fmtCurrency = (val: string | number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));

// ── Customer Search Input ─────────────────────────────────────────────────────
function CustomerSearch({ token, value, onChange }: {
  token: string;
  value: { id: string; name: string } | null;
  onChange: (c: { id: string; name: string } | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const r = await fetch(`${API}/api/customers?search=${encodeURIComponent(query)}&limit=8`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setResults(d.customers || []);
      setOpen(true);
    }, 300);
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5">
        <User size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex-1">{value.name}</span>
        <button onClick={() => onChange(null)} className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar cliente..."
        className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {results.map(c => (
            <button
              key={c.id}
              onMouseDown={() => { onChange({ id: c.id, name: c.name }); setQuery(''); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <span className="font-medium dark:text-white">{c.name}</span>
              {c.phone && <span className="text-zinc-400 ml-2 text-xs">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Product Search for Items ──────────────────────────────────────────────────
function ProductSearch({ token, itemType, onSelect }: {
  token: string;
  itemType: ItemType;
  onSelect: (p: Product) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const r = await fetch(`${API}/api/products?search=${encodeURIComponent(query)}&limit=8`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setResults(d.products || []);
      setOpen(true);
    }, 300);
  }, [query]);

  return (
    <div className="relative flex-1">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={itemType === 'SERVICE' ? 'Buscar serviço...' : 'Buscar produto...'}
        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {results.map(p => (
            <button
              key={p.id}
              onMouseDown={() => { onSelect(p); setQuery(''); setOpen(false); setResults([]); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex justify-between items-center gap-2"
            >
              <div>
                <span className="font-medium dark:text-white">{p.name}</span>
                <span className="text-zinc-400 text-xs ml-2">{p.sku}</span>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs shrink-0">
                {fmtCurrency(p.sale_price)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Nova OS Modal ─────────────────────────────────────────────────────────────
function NewOsModal({ token, onClose, onCreated }: {
  token: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [expectedAt, setExpectedAt] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [items, setItems] = useState<OsItem[]>([]);
  const [assetFields, setAssetFields] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addItem = (type: ItemType, product?: Product) => {
    setItems(prev => [...prev, {
      item_type: type,
      product_id: product?.id,
      description: product?.name ?? '',
      quantity: 1,
      unit_price: product ? Number(product.sale_price) : 0,
      discount: 0,
    }]);
  };

  const updateItem = (idx: number, field: keyof OsItem, val: unknown) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const total = items.reduce((sum, it) => sum + it.quantity * it.unit_price - it.discount, 0);

  const handleSubmit = async () => {
    if (items.length === 0) { setError('Adicione pelo menos um item à OS.'); return; }
    setSaving(true);
    setError('');

    const assetMetadata: Record<string, string> = {};
    for (const f of assetFields) {
      if (f.key.trim() && f.value.trim()) assetMetadata[f.key.trim()] = f.value.trim();
    }

    try {
      const r = await fetch(`${API}/api/service-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_id: customer?.id,
          expected_at: expectedAt || undefined,
          customer_notes: customerNotes || undefined,
          internal_notes: internalNotes || undefined,
          asset_metadata: assetMetadata,
          items,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || d.errors?.[0]?.msg || 'Erro ao criar OS'); setSaving(false); return; }
      onCreated();
    } catch {
      setError('Falha de conexão');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Nova Ordem de Serviço</h2>
            <p className="text-xs text-zinc-500">Preencha os dados e adicione os itens</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Cliente */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Cliente</label>
            <CustomerSearch token={token} value={customer} onChange={setCustomer} />
          </div>

          {/* Dados do ativo (JSONB livre) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Dados do Equipamento / Veículo</label>
              <button
                onClick={() => setAssetFields(prev => [...prev, { key: '', value: '' }])}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <PlusCircle size={12} /> Adicionar campo
              </button>
            </div>
            <div className="space-y-2">
              {assetFields.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={f.key}
                    onChange={e => setAssetFields(prev => prev.map((x, xi) => xi === i ? { ...x, key: e.target.value } : x))}
                    placeholder="Campo (ex: Placa, IMEI)"
                    className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none dark:text-white"
                  />
                  <input
                    value={f.value}
                    onChange={e => setAssetFields(prev => prev.map((x, xi) => xi === i ? { ...x, value: e.target.value } : x))}
                    placeholder="Valor (ex: ABC-1234)"
                    className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none dark:text-white"
                  />
                  {assetFields.length > 1 && (
                    <button onClick={() => setAssetFields(prev => prev.filter((_, xi) => xi !== i))} className="text-zinc-400 hover:text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Data de entrega */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Previsão de Entrega</label>
            <input
              type="date"
              value={expectedAt}
              onChange={e => setExpectedAt(e.target.value)}
              className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none dark:text-white dark:[color-scheme:dark]"
            />
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Itens da OS</label>
              <div className="flex gap-2">
                <button
                  onClick={() => addItem('SERVICE')}
                  className="flex items-center gap-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors font-medium"
                >
                  <Wrench size={12} /> + Serviço
                </button>
                <button
                  onClick={() => addItem('PRODUCT')}
                  className="flex items-center gap-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-medium"
                >
                  <Package size={12} /> + Produto
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl py-8 text-center text-zinc-400 text-sm">
                Nenhum item. Use os botões acima para adicionar serviços e peças.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header columns */}
                <div className="grid grid-cols-[1fr_80px_110px_90px_32px] gap-2 px-1">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Descrição</span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider text-center">Qtd</span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider text-center">Valor Unit.</span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider text-right">Total</span>
                  <span />
                </div>

                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className={`grid grid-cols-[1fr_80px_110px_90px_32px] gap-2 items-center p-2 rounded-xl border ${
                      it.item_type === 'SERVICE'
                        ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30'
                        : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {it.item_type === 'SERVICE'
                        ? <Wrench size={13} className="text-indigo-400 shrink-0" />
                        : <Package size={13} className="text-blue-400 shrink-0" />
                      }
                      {it.description ? (
                        <input
                          value={it.description}
                          onChange={e => updateItem(idx, 'description', e.target.value)}
                          className="flex-1 min-w-0 bg-transparent text-sm dark:text-white border-b border-transparent focus:border-zinc-300 dark:focus:border-zinc-600 outline-none"
                        />
                      ) : (
                        <ProductSearch
                          token={token}
                          itemType={it.item_type}
                          onSelect={p => {
                            updateItem(idx, 'description', p.name);
                            updateItem(idx, 'product_id', p.id);
                            updateItem(idx, 'unit_price', Number(p.sale_price));
                          }}
                        />
                      )}
                    </div>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={it.quantity}
                      onChange={e => updateItem(idx, 'quantity', Math.max(0.001, Number(e.target.value)))}
                      className="text-center text-sm px-2 py-1 bg-white/60 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none dark:text-white"
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.unit_price}
                        onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                        className="w-full pl-7 pr-2 py-1 text-sm bg-white/60 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none dark:text-white"
                      />
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white text-right">
                      {fmtCurrency(it.quantity * it.unit_price - it.discount)}
                    </span>
                    <button onClick={() => removeItem(idx)} className="text-zinc-300 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                {/* Total */}
                <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm text-zinc-500 mr-3">Total:</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{fmtCurrency(total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Obs. para o Cliente</label>
              <textarea
                value={customerNotes}
                onChange={e => setCustomerNotes(e.target.value)}
                rows={3}
                placeholder="Visível para o cliente no link de aprovação..."
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm resize-none focus:outline-none dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Notas Internas</label>
              <textarea
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                rows={3}
                placeholder="Apenas para sua equipe..."
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm resize-none focus:outline-none dark:text-white"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0 gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors">
            Cancelar
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              Salvar como Rascunho
            </button>
            <button
              onClick={async () => {
                // Sets status to PENDING_APPROVAL after creation — sends WhatsApp
                if (items.length === 0) { setError('Adicione pelo menos um item à OS.'); return; }
                setSaving(true);
                setError('');
                const assetMetadata: Record<string, string> = {};
                for (const f of assetFields) {
                  if (f.key.trim() && f.value.trim()) assetMetadata[f.key.trim()] = f.value.trim();
                }
                try {
                  const r = await fetch(`${API}/api/service-orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      customer_id: customer?.id,
                      expected_at: expectedAt || undefined,
                      customer_notes: customerNotes || undefined,
                      internal_notes: internalNotes || undefined,
                      asset_metadata: assetMetadata,
                      items,
                    }),
                  });
                  const d = await r.json();
                  if (!r.ok) { setError(d.error || 'Erro ao criar OS'); setSaving(false); return; }

                  // Transition to PENDING_APPROVAL (triggers WhatsApp)
                  await fetch(`${API}/api/service-orders/${d.service_order.id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ status: 'PENDING_APPROVAL', note: 'Enviado para aprovação do cliente' }),
                  });

                  onCreated();
                } catch {
                  setError('Falha de conexão');
                  setSaving(false);
                }
              }}
              disabled={saving || !customer}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              title={!customer ? 'Selecione um cliente para enviar aprovação' : ''}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              Enviar para Aprovação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function Services() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showNewModal, setShowNewModal] = useState(false);

  const token = localStorage.getItem('auth_token') ?? '';

  const fetchData = async () => {
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      if (search) qp.append('search', search);
      if (statusFilter) qp.append('status', statusFilter);

      const [osRes, statsRes] = await Promise.all([
        fetch(`${API}/api/service-orders?${qp}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/service-orders/stats`,  { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [osData, statsData] = await Promise.all([osRes.json(), statsRes.json()]);
      setOrders(osData.service_orders || []);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching OS:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  return (
    <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Ordens de Serviço</h1>
          <p className="text-sm text-zinc-500">Gerencie manutenções, reparos e assistências.</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 w-full md:w-auto justify-center"
        >
          <Plus size={18} /> Nova Ordem de Serviço
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Em Aberto',  icon: Wrench,       color: 'text-zinc-500',    val: stats.in_progress + stats.draft + stats.waiting_parts },
            { label: 'Aguardando', icon: Clock,        color: 'text-amber-500',   val: stats.waiting_parts },
            { label: 'Concluídas', icon: CheckCircle2, color: 'text-emerald-500', val: stats.completed },
            { label: 'Receita',    icon: DollarSign,   color: 'text-emerald-400', val: fmtCurrency(stats.revenue_completed), isText: true },
          ].map(({ label, icon: Icon, color, val, isText }) => (
            <div key={label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
              <div className={`flex items-center gap-2 mb-3 ${color}`}>
                <Icon size={18} />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</span>
              </div>
              <div className={`font-black text-zinc-900 dark:text-white ${isText ? 'text-xl' : 'text-2xl'}`}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4">
          <form onSubmit={e => { e.preventDefault(); fetchData(); }} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por cliente ou Nº da OS..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
            />
          </form>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none dark:text-white"
          >
            <option value="">Todos os Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
              <p className="text-sm text-zinc-500">Carregando ordens de serviço...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mb-6 text-zinc-300">
                <Wrench size={40} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Nenhuma OS encontrada</h3>
              <p className="text-sm text-zinc-500 max-w-xs">
                {search || statusFilter
                  ? 'Tente ajustar os filtros.'
                  : 'Comece criando sua primeira ordem de serviço.'}
              </p>
              {!search && !statusFilter && (
                <button
                  onClick={() => setShowNewModal(true)}
                  className="mt-6 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <Plus size={16} /> Nova OS
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/30">
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">OS / Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Entrega</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Técnico</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {orders.map(os => {
                  const cfg = STATUS_CONFIG[os.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={os.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-zinc-900 dark:text-white block">
                          OS-{String(os.os_number).padStart(4, '0')}
                        </span>
                        <span className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                          <User size={10} /> {os.customer_name || 'Sem cliente'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-tight ${cfg.color}`}>
                          <StatusIcon size={11} /> {cfg.label}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                          <Calendar size={12} />
                          {os.expected_at ? new Date(os.expected_at).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-zinc-500 italic">{os.assignee_name || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{fmtCurrency(os.total)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" title="Ver detalhes">
                            <ExternalLink size={16} />
                          </button>
                          <button className="p-2 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all" title="Editar">
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showNewModal && (
        <NewOsModal
          token={token}
          onClose={() => setShowNewModal(false)}
          onCreated={() => { setShowNewModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}
