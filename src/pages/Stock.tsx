import { useState, useEffect, useCallback, useRef, type FormEvent, type ChangeEvent } from 'react';
import {
  Search, Plus, Package, X, RefreshCw, ChevronDown,
  MoreHorizontal, Pencil, Trash2, Copy, Upload, Image as ImageIcon,
  ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import { uploadApi } from '../lib/api';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';
const token = () => localStorage.getItem('auth_token') || '';

const apiFetch = async <T,>(path: string, opts: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${API}/api/products${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...opts.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro na requisição');
  }
  return res.json();
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category { id: string; name: string; color: string; product_count: number; }

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  unit: string;
  image_url?: string;
  is_active: boolean;
  metadata?: Record<string, unknown>;
}

interface Stats {
  total_products: number;
  out_of_stock: number;
  low_stock: number;
  stock_value: number;
}

interface NicheField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  options?: string[];
  placeholder?: string;
}

interface NicheTemplate {
  id: string;
  name: string;
  slug: string;
  form_schema: NicheField[];
}

interface ProductForm {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  category_id: string;
  cost_price: string;
  sale_price: string;
  stock_quantity: string;
  min_stock: string;
  unit: string;
  image_url: string;
  metadata: Record<string, string>;
}

const EMPTY_FORM: ProductForm = {
  name: '', sku: '', barcode: '', description: '',
  category_id: '', cost_price: '', sale_price: '',
  stock_quantity: '0', min_stock: '0', unit: 'UN', image_url: '',
  metadata: {},
};

const UNITS = ['UN', 'KG', 'L', 'M', 'CX', 'PC', 'PAR', 'M²', 'M³'];

function stockStatus(p: Product): 'ok' | 'low' | 'out' {
  if (p.stock_quantity === 0) return 'out';
  if (p.min_stock > 0 && p.stock_quantity <= p.min_stock) return 'low';
  return 'ok';
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'ok' | 'low' | 'out' }) {
  if (status === 'ok') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Em Estoque
    </span>
  );
  if (status === 'low') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Estoque Baixo
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
      Esgotado
    </span>
  );
}

// ── Kebab menu ────────────────────────────────────────────────────────────────

function KebabMenu({
  onEdit, onDuplicate, onDelete,
}: { onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-40 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-1">
          <button onClick={() => { setOpen(false); onEdit(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
            <Pencil size={14} /> Editar
          </button>
          <button onClick={() => { setOpen(false); onDuplicate(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
            <Copy size={14} /> Duplicar
          </button>
          <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />
          <button onClick={() => { setOpen(false); onDelete(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      )}
    </div>
  );
}

// ── Product Drawer (tabs) ─────────────────────────────────────────────────────

type DrawerTab = 'general' | 'niche' | 'stock';

function ProductDrawer({
  product,
  categories,
  nicheTemplate,
  onClose,
  onSave,
}: {
  product: Product | null;
  categories: Category[];
  nicheTemplate: NicheTemplate | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const buildForm = (p: Product | null): ProductForm => p ? {
    name: p.name, sku: p.sku, barcode: p.barcode ?? '',
    description: p.description ?? '', category_id: p.category_id ?? '',
    cost_price: p.cost_price.toString(), sale_price: p.sale_price.toString(),
    stock_quantity: p.stock_quantity.toString(), min_stock: p.min_stock.toString(),
    unit: p.unit, image_url: p.image_url ?? '',
    metadata: Object.fromEntries(
      Object.entries(p.metadata ?? {}).map(([k, v]) => [k, String(v)])
    ),
  } : EMPTY_FORM;

  const [form, setForm] = useState<ProductForm>(() => buildForm(product));
  const [tab, setTab] = useState<DrawerTab>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const margin = (() => {
    const c = parseFloat(form.cost_price) || 0;
    const s = parseFloat(form.sale_price) || 0;
    if (s <= 0) return null;
    return (((s - c) / s) * 100).toFixed(1);
  })();

  const set = (f: keyof ProductForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [f]: e.target.value }));

  const setMeta = (key: string, value: string) =>
    setForm(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }));

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Selecione uma imagem válida'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Imagem muito grande. Máximo 5MB'); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      let imageUrl = form.image_url;
      if (selectedFile) {
        setUploading(true);
        const r = await uploadApi.upload(selectedFile);
        imageUrl = r.url;
        setUploading(false);
      }
      const body = {
        name: form.name, sku: form.sku,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        category_id: form.category_id || undefined,
        cost_price: parseFloat(form.cost_price) || 0,
        sale_price: parseFloat(form.sale_price) || 0,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        min_stock: parseInt(form.min_stock) || 0,
        unit: form.unit,
        image_url: imageUrl || undefined,
        metadata: Object.keys(form.metadata).length > 0 ? form.metadata : undefined,
      };
      if (product) {
        await apiFetch(`/${product.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/', { method: 'POST', body: JSON.stringify(body) });
      }
      onSave();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
    setSaving(false);
    setUploading(false);
  };

  const inputCls = 'w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 dark:text-white transition-colors';
  const labelCls = 'block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wide';

  const tabs: { id: DrawerTab; label: string }[] = [
    { id: 'general', label: 'Informações Gerais' },
    ...(nicheTemplate ? [{ id: 'niche' as DrawerTab, label: nicheTemplate.name }] : []),
    { id: 'stock', label: 'Estoque' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 w-full max-w-xl h-full flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="font-bold text-base dark:text-white">
              {product ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {product ? `SKU: ${product.sku}` : 'Preencha os dados do produto'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-1 py-3 mr-5 text-sm font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            {/* ── Aba: Informações Gerais ── */}
            {tab === 'general' && (
              <>
                {/* Image */}
                <div>
                  <label className={labelCls}>Foto do Produto</label>
                  <div className="flex gap-4 items-start">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors shrink-0',
                        previewUrl
                          ? 'border-zinc-200 dark:border-zinc-700'
                          : 'border-zinc-300 dark:border-zinc-700 hover:border-emerald-500'
                      )}
                    >
                      {previewUrl ? (
                        <img src={previewUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <>
                          <ImageIcon size={22} className="text-zinc-400 mb-1" />
                          <span className="text-[10px] text-zinc-400">Clique para enviar</span>
                        </>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 transition-colors"
                      >
                        <Upload size={14} /> {uploading ? 'Enviando…' : 'Selecionar imagem'}
                      </button>
                      {previewUrl && (
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setPreviewUrl(null); setForm(p => ({ ...p, image_url: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remover imagem
                        </button>
                      )}
                      <p className="text-xs text-zinc-400">JPG, PNG até 5 MB</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className={labelCls}>Nome do Produto *</label>
                  <input required value={form.name} onChange={set('name')} placeholder="Ex: Pastilha de Freio GSN Pro" className={inputCls} />
                </div>

                {/* SKU + Barcode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>SKU *</label>
                    <input required value={form.sku} onChange={set('sku')} placeholder="GSN-001" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Código de Barras</label>
                    <input value={form.barcode} onChange={set('barcode')} placeholder="7891234567890" className={inputCls} />
                  </div>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Preço de Custo</label>
                    <input type="number" step="0.01" min="0" value={form.cost_price} onChange={set('cost_price')} placeholder="0,00" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Preço de Venda *
                      {margin !== null && (
                        <span className={cn('ml-2 font-normal normal-case tracking-normal', parseFloat(margin) >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                          {margin}% margem
                        </span>
                      )}
                    </label>
                    <input required type="number" step="0.01" min="0" value={form.sale_price} onChange={set('sale_price')} placeholder="0,00" className={inputCls} />
                  </div>
                </div>

                {/* Category + Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Categoria</label>
                    <select value={form.category_id} onChange={set('category_id')} className={inputCls}>
                      <option value="">Sem categoria</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Unidade</label>
                    <select value={form.unit} onChange={set('unit')} className={inputCls}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className={labelCls}>Descrição</label>
                  <textarea
                    value={form.description} onChange={set('description')}
                    rows={3} placeholder="Descrição do produto..."
                    className={cn(inputCls, 'resize-none')}
                  />
                </div>
              </>
            )}

            {/* ── Aba: Nicho ── */}
            {tab === 'niche' && nicheTemplate && (
              <>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Campos específicos para <span className="font-semibold text-zinc-700 dark:text-zinc-300">{nicheTemplate.name}</span>.
                </p>
                {nicheTemplate.form_schema.map(field => (
                  <div key={field.key}>
                    <label className={labelCls}>{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={form.metadata[field.key] ?? ''}
                        onChange={e => setMeta(field.key, e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Selecionar…</option>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={form.metadata[field.key] ?? ''}
                        onChange={e => setMeta(field.key, e.target.value)}
                        placeholder={field.placeholder ?? ''}
                        className={inputCls}
                      />
                    )}
                  </div>
                ))}
                {nicheTemplate.form_schema.length === 0 && (
                  <p className="text-sm text-zinc-400 text-center py-8">Nenhum campo dinâmico configurado para este nicho.</p>
                )}
              </>
            )}

            {/* ── Aba: Estoque ── */}
            {tab === 'stock' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Quantidade em Estoque</label>
                    <input type="number" min="0" value={form.stock_quantity} onChange={set('stock_quantity')} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Estoque Mínimo</label>
                    <input type="number" min="0" value={form.min_stock} onChange={set('min_stock')} className={inputCls} />
                    <p className="text-xs text-zinc-400 mt-1">Alertas de baixo estoque abaixo deste valor</p>
                  </div>
                </div>
                {product && (
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Resumo atual</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">Estoque atual</span>
                      <span className="text-sm font-bold dark:text-white">{product.stock_quantity} {product.unit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">Valor em estoque</span>
                      <span className="text-sm font-bold dark:text-white">{fmtBRL(product.stock_quantity * product.cost_price)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">Status</span>
                      <StatusBadge status={stockStatus(product)} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 shrink-0">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? (uploading ? 'Enviando imagem…' : 'Salvando…') : (product ? 'Salvar alterações' : 'Adicionar produto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────

function DeleteModal({ product, onClose, onConfirm }: {
  product: Product; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h3 className="font-bold text-center dark:text-white mb-1">Excluir produto</h3>
        <p className="text-sm text-zinc-500 text-center mb-6">
          Tem certeza que deseja excluir <strong className="text-zinc-700 dark:text-zinc-300">{product.name}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Excluir</button>
        </div>
      </div>
    </div>
  );
}

// ── Stock Adjust Modal ────────────────────────────────────────────────────────

function StockAdjustModal({ product, onClose, onSave }: {
  product: Product; onClose: () => void; onSave: () => void;
}) {
  const [mode, setMode] = useState<'add' | 'remove' | 'set'>('add');
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const preview = mode === 'set' ? qty : mode === 'add' ? product.stock_quantity + qty : Math.max(0, product.stock_quantity - qty);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const delta = mode === 'set' ? qty - product.stock_quantity : mode === 'add' ? qty : -qty;
      await apiFetch(`/${product.id}/stock`, { method: 'PATCH', body: JSON.stringify({ quantity: delta, reason }) });
      onSave();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold dark:text-white">Ajuste de Estoque</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
        </div>
        <p className="text-sm text-zinc-500 mb-4">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{product.name}</span> — atual: <strong>{product.stock_quantity} {product.unit}</strong>
        </p>
        {error && <div className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {(['add', 'remove', 'set'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={cn('flex-1 py-2 text-xs font-semibold transition-colors',
                  mode === m ? 'bg-emerald-600 text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                )}>
                {m === 'add' ? 'Adicionar' : m === 'remove' ? 'Remover' : 'Definir'}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wide">Quantidade</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setQty(q => Math.max(0, q - 1))} className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">-</button>
              <input type="number" min="0" value={qty} onChange={e => setQty(parseInt(e.target.value) || 0)}
                className="flex-1 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-emerald-500 dark:text-white" />
              <button type="button" onClick={() => setQty(q => q + 1)} className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">+</button>
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm text-zinc-500">Resultado</span>
            <span className={cn('text-sm font-bold', preview < 0 ? 'text-red-500' : 'dark:text-white')}>{Math.max(0, preview)} {product.unit}</span>
          </div>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (opcional)" className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 dark:text-white" />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Stock component ───────────────────────────────────────────────────────

export function Stock() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [nicheTemplate, setNicheTemplate] = useState<NicheTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modals
  const [drawerProduct, setDrawerProduct] = useState<Product | null | 'new'>(undefined as unknown as null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (statusFilter === 'active') params.set('is_active', 'true');
      if (statusFilter === 'inactive') params.set('is_active', 'false');

      const [{ products: ps, pagination }, cats, st] = await Promise.all([
        apiFetch<{ products: Product[]; pagination: { totalPages: number } }>(`/?${params}`),
        apiFetch<{ categories: Category[] }>('/categories/all'),
        apiFetch<Stats>('/stats/summary'),
      ]);
      setProducts(ps);
      setTotalPages(pagination.totalPages);
      setCategories(cats.categories);
      setStats(st);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search, categoryFilter, statusFilter]);

  // Load niche template from tenant user
  useEffect(() => {
    const tid = (user as unknown as { niche_template_id?: string })?.niche_template_id;
    if (!tid) return;
    fetch(`${API}/api/niches/${tid}/schema`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setNicheTemplate(d.niche ?? null))
      .catch(() => {});
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setPage(1), 400);
  };

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = () =>
    setSelected(prev => prev.size === products.length ? new Set() : new Set(products.map(p => p.id)));

  const handleDelete = async (product: Product) => {
    try {
      await apiFetch(`/${product.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      load();
    } catch { /* ignore */ }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      const body = {
        name: `${product.name} (cópia)`, sku: `${product.sku}-COPY`,
        barcode: product.barcode, description: product.description,
        category_id: product.category_id, cost_price: product.cost_price,
        sale_price: product.sale_price, stock_quantity: 0,
        min_stock: product.min_stock, unit: product.unit, image_url: product.image_url,
      };
      await apiFetch('/', { method: 'POST', body: JSON.stringify(body) });
      load();
    } catch { /* ignore */ }
  };

  const statItems = stats ? [
    { label: 'Total de produtos', value: stats.total_products, color: 'text-zinc-800 dark:text-white' },
    { label: 'Esgotados', value: stats.out_of_stock, color: 'text-zinc-800 dark:text-white' },
    { label: 'Estoque baixo', value: stats.low_stock, color: 'text-amber-600' },
    { label: 'Valor em estoque', value: fmtBRL(Number(stats.stock_value)), color: 'text-emerald-600' },
  ] : [];

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold dark:text-white">Estoque (Catálogo)</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{stats?.total_products ?? '—'} produtos cadastrados</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => { setDrawerProduct(null); setDrawerOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
            >
              <Plus size={16} /> Adicionar Produto
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {statItems.map(s => (
              <div key={s.label} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl px-4 py-3">
                <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
                <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar por nome, SKU ou código de barras..."
              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:text-white transition-colors"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <select
              value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
              className="pl-8 pr-6 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:text-white appearance-none transition-colors"
            >
              <option value="">Todas as categorias</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.product_count})</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="pl-3 pr-6 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:text-white appearance-none transition-colors"
            >
              <option value="">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
            <Package size={36} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">Nenhum produto encontrado</p>
            <p className="text-xs mt-1">Tente outros filtros ou adicione um produto</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-10">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === products.length && products.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-300 dark:border-zinc-600 accent-emerald-600"
                  />
                </th>
                <th className="w-14 px-2 py-3" />
                <th className="px-3 py-3 text-left font-semibold text-xs text-zinc-500 uppercase tracking-wide">SKU</th>
                <th className="px-3 py-3 text-left font-semibold text-xs text-zinc-500 uppercase tracking-wide">Nome do Produto</th>
                {nicheTemplate && nicheTemplate.form_schema.slice(0, 2).map(f => (
                  <th key={f.key} className="px-3 py-3 text-left font-semibold text-xs text-zinc-500 uppercase tracking-wide hidden lg:table-cell">{f.label}</th>
                ))}
                <th className="px-3 py-3 text-left font-semibold text-xs text-zinc-500 uppercase tracking-wide">Status</th>
                <th className="px-3 py-3 text-right font-semibold text-xs text-zinc-500 uppercase tracking-wide">Preço</th>
                <th className="px-3 py-3 text-center font-semibold text-xs text-zinc-500 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {products.map(p => (
                <tr
                  key={p.id}
                  className={cn(
                    'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors',
                    selected.has(p.id) && 'bg-emerald-50 dark:bg-emerald-900/10'
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="rounded border-zinc-300 dark:border-zinc-600 accent-emerald-600"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        : <Package size={18} className="text-zinc-400" />
                      }
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {p.sku}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-zinc-900 dark:text-white leading-tight">{p.name}</p>
                    {p.category_name && (
                      <p className="text-xs text-zinc-400 mt-0.5">{p.category_name}</p>
                    )}
                  </td>
                  {nicheTemplate && nicheTemplate.form_schema.slice(0, 2).map(f => (
                    <td key={f.key} className="px-3 py-3 hidden lg:table-cell">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        {(p.metadata?.[f.key] as string) ?? '—'}
                      </span>
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={stockStatus(p)} />
                      <span className="text-xs text-zinc-400">{p.stock_quantity} {p.unit}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{fmtBRL(p.sale_price)}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setAdjustTarget(p)}
                        className="px-2 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors"
                        title="Ajustar estoque"
                      >
                        Qtd
                      </button>
                      <KebabMenu
                        onEdit={() => { setDrawerProduct(p); setDrawerOpen(true); }}
                        onDuplicate={() => handleDuplicate(p)}
                        onDelete={() => setDeleteTarget(p)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <span className="text-sm text-zinc-500">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl">
          <span className="text-sm font-semibold">{selected.size} selecionado{selected.size > 1 ? 's' : ''}</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-zinc-400 hover:text-white">Desmarcar</button>
          <button className="text-xs text-red-400 hover:text-red-300 font-medium">Excluir selecionados</button>
        </div>
      )}

      {/* Modals */}
      {drawerOpen && (
        <ProductDrawer
          product={drawerProduct === 'new' ? null : drawerProduct}
          categories={categories}
          nicheTemplate={nicheTemplate}
          onClose={() => { setDrawerOpen(false); setDrawerProduct(null); }}
          onSave={load}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
      {adjustTarget && (
        <StockAdjustModal
          product={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSave={load}
        />
      )}
    </div>
  );
}
