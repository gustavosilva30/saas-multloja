import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import {
  Search, Plus, Pencil, Trash2, Package, AlertTriangle,
  XCircle, TrendingUp, Filter, X, RefreshCw, Tag, ChevronDown,
  ArrowUpDown, BarChart2, List, LayoutGrid, Minus,
} from 'lucide-react';

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
}

interface Stats {
  total_products: number;
  out_of_stock: number;
  low_stock: number;
  stock_value: number;
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
}

const EMPTY_FORM: ProductForm = {
  name: '', sku: '', barcode: '', description: '',
  category_id: '', cost_price: '', sale_price: '',
  stock_quantity: '0', min_stock: '0', unit: 'UN', image_url: '',
};

const UNITS = ['UN', 'KG', 'L', 'M', 'CX', 'PC', 'PAR', 'M²', 'M³'];

function stockStatus(p: Product) {
  if (p.stock_quantity === 0) return 'out';
  if (p.min_stock > 0 && p.stock_quantity <= p.min_stock) return 'low';
  return 'ok';
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Modals ────────────────────────────────────────────────────────────────────

function ProductModal({
  product,
  categories,
  onClose,
  onSave,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState<ProductForm>(
    product
      ? {
          name: product.name,
          sku: product.sku,
          barcode: product.barcode ?? '',
          description: product.description ?? '',
          category_id: product.category_id ?? '',
          cost_price: product.cost_price.toString(),
          sale_price: product.sale_price.toString(),
          stock_quantity: product.stock_quantity.toString(),
          min_stock: product.min_stock.toString(),
          unit: product.unit,
          image_url: product.image_url ?? '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (f: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        category_id: form.category_id || undefined,
        cost_price: parseFloat(form.cost_price) || 0,
        sale_price: parseFloat(form.sale_price) || 0,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        min_stock: parseInt(form.min_stock) || 0,
        unit: form.unit,
        image_url: form.image_url || undefined,
      };
      if (product) {
        await apiFetch(`/${product.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/', { method: 'POST', body: JSON.stringify(body) });
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  const field = (label: string, name: keyof ProductForm, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={set(name)}
        placeholder={placeholder}
        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 dark:text-white transition-colors"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 w-full max-w-lg h-full flex flex-col shadow-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <div>
            <h2 className="font-bold text-lg dark:text-white">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{product ? `SKU: ${product.sku}` : 'Preencha os dados do produto'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Image preview */}
          {form.image_url && (
            <div className="w-full h-40 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
              <img src={form.image_url} alt="preview" className="h-full w-full object-contain" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">{field('Nome do produto *', 'name', 'text', 'Ex: Camisa Polo Azul')}</div>
            {field('SKU *', 'sku', 'text', 'Ex: CAM-001')}
            {field('Código de barras', 'barcode', 'text', 'EAN-13')}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Categoria</label>
            <select
              value={form.category_id}
              onChange={set('category_id')}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 dark:text-white"
            >
              <option value="">Sem categoria</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Descrição</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={set('description')}
              placeholder="Descrição do produto..."
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 dark:text-white resize-none"
            />
          </div>

          {/* Pricing */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Preços</p>
            <div className="grid grid-cols-2 gap-4">
              {field('Custo (R$)', 'cost_price', 'number', '0,00')}
              {field('Venda (R$) *', 'sale_price', 'number', '0,00')}
            </div>
            {form.cost_price && form.sale_price && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                Margem: {(((parseFloat(form.sale_price) - parseFloat(form.cost_price)) / parseFloat(form.cost_price)) * 100).toFixed(1)}%
              </p>
            )}
          </div>

          {/* Stock */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Estoque</p>
            <div className="grid grid-cols-3 gap-4">
              {field('Quantidade', 'stock_quantity', 'number', '0')}
              {field('Estoque mín.', 'min_stock', 'number', '0')}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Unidade</label>
                <select
                  value={form.unit}
                  onChange={set('unit')}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 dark:text-white"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          {field('URL da imagem', 'image_url', 'text', 'https://...')}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 sticky bottom-0 bg-white dark:bg-zinc-900">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={!form.name || !form.sku || !form.sale_price || saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : null}
            {product ? 'Salvar alterações' : 'Criar produto'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StockAdjustModal({
  product,
  onClose,
  onSave,
}: {
  product: Product;
  onClose: () => void;
  onSave: () => void;
}) {
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [op, setOp] = useState<'add' | 'remove' | 'set'>('add');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const newQty = () => {
    const n = parseInt(qty) || 0;
    if (op === 'add') return product.stock_quantity + n;
    if (op === 'remove') return product.stock_quantity - n;
    return n;
  };

  const handleSubmit = async () => {
    const n = parseInt(qty) || 0;
    if (!n) { setError('Informe uma quantidade'); return; }
    setSaving(true);
    setError('');
    try {
      let delta = n;
      if (op === 'remove') delta = -n;
      if (op === 'set') delta = n - product.stock_quantity;
      await apiFetch(`/${product.id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: delta, reason: reason || undefined }),
      });
      onSave();
      onClose();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  const preview = newQty();

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="font-bold dark:text-white">Ajustar Estoque</h3>
            <p className="text-sm text-zinc-500 truncate max-w-[220px]">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Current stock */}
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 rounded-xl px-4 py-3">
            <span className="text-sm text-zinc-500">Estoque atual</span>
            <span className="font-bold text-lg dark:text-white">{product.stock_quantity} {product.unit}</span>
          </div>

          {/* Operation */}
          <div className="grid grid-cols-3 gap-2">
            {([['add', 'Adicionar', '+'], ['remove', 'Remover', '-'], ['set', 'Definir', '=']] as const).map(([v, label, icon]) => (
              <button
                key={v}
                onClick={() => setOp(v)}
                className={`py-2 rounded-xl text-sm font-semibold transition-colors flex flex-col items-center gap-0.5 ${
                  op === v
                    ? v === 'add' ? 'bg-emerald-500 text-white' : v === 'remove' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <span className="text-lg font-black leading-none">{icon}</span>
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>

          {/* Quantity input */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(q => Math.max(0, (parseInt(q) || 0) - 1).toString())}
              className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              min="0"
              value={qty}
              onChange={e => setQty(e.target.value)}
              placeholder="0"
              className="flex-1 text-center bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xl font-bold focus:outline-none focus:border-emerald-500 dark:text-white"
            />
            <button
              onClick={() => setQty(q => ((parseInt(q) || 0) + 1).toString())}
              className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Preview */}
          {qty && (
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
              preview < 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'
            }`}>
              <span className="text-sm text-zinc-500">Novo estoque</span>
              <span className={`font-bold text-lg ${preview < 0 ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {preview} {product.unit}
              </span>
            </div>
          )}

          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Motivo (opcional): ex. compra, devolução..."
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 dark:text-white"
          />

          <button
            onClick={handleSubmit}
            disabled={!qty || saving}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : null}
            Confirmar ajuste
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const PRESET_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4'];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch('/categories', { method: 'POST', body: JSON.stringify({ name, color }) });
      onSave();
      onClose();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-xs shadow-2xl border border-zinc-200 dark:border-zinc-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="font-bold dark:text-white">Nova Categoria</h3>
          <button onClick={onClose} className="text-zinc-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Nome</label>
            <input
              value={name} onChange={e => setName(e.target.value)} required
              placeholder="Ex: Eletrônicos"
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button type="button" key={c} onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-zinc-400' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <button type="submit" disabled={!name || saving}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            {saving ? 'Criando...' : 'Criar categoria'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function Stock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'out' | 'low'>('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [showProduct, setShowProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [showCategory, setShowCategory] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category_id', categoryFilter);

      const [pData, cData, sData] = await Promise.all([
        apiFetch<{ products: Product[]; pagination: { totalPages: number; total: number } }>(`/?${params}`),
        apiFetch<{ categories: Category[] }>('/categories/all'),
        apiFetch<Stats>('/stats/summary'),
      ]);

      let prods = pData.products;
      if (statusFilter === 'out') prods = prods.filter(p => p.stock_quantity === 0);
      if (statusFilter === 'low') prods = prods.filter(p => p.stock_quantity > 0 && p.min_stock > 0 && p.stock_quantity <= p.min_stock);

      setProducts(prods);
      setCategories(cData.categories);
      setStats(sData);
      setTotalPages(pData.pagination.totalPages);
      setTotal(pData.pagination.total);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [search, categoryFilter, statusFilter, page]);

  useEffect(() => {
    const t = setTimeout(loadData, 300);
    return () => clearTimeout(t);
  }, [loadData]);

  const handleDelete = async (p: Product) => {
    await apiFetch(`/${p.id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    loadData();
  };

  const statCards = stats
    ? [
        { label: 'Total de produtos', value: stats.total_products, icon: Package, color: 'blue' },
        { label: 'Sem estoque', value: stats.out_of_stock, icon: XCircle, color: 'red' },
        { label: 'Estoque baixo', value: stats.low_stock, icon: AlertTriangle, color: 'amber' },
        { label: 'Valor em estoque', value: fmtBRL(Number(stats.stock_value)), icon: TrendingUp, color: 'emerald', wide: true },
      ]
    : [];

  return (
    <div className="h-full flex flex-col space-y-5 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black dark:text-white">Gestão de Estoque</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{total} produto{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategory(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Tag size={15} /> Categorias
          </button>
          <button
            onClick={() => { setEditProduct(null); setShowProduct(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Plus size={15} /> Novo Produto
          </button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/30' :
                color === 'red' ? 'bg-red-50 dark:bg-red-900/30' :
                color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/30' :
                'bg-emerald-50 dark:bg-emerald-900/30'
              }`}>
                <Icon size={17} className={
                  color === 'blue' ? 'text-blue-500' : color === 'red' ? 'text-red-500' :
                  color === 'amber' ? 'text-amber-500' : 'text-emerald-500'
                } />
              </div>
              <p className="text-xl font-black dark:text-white">{value}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nome, SKU ou código de barras..."
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-emerald-500 dark:text-white"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm dark:text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">Todas categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.product_count})</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as '' | 'out' | 'low'); setPage(1); }}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm dark:text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">Todos os status</option>
          <option value="out">Sem estoque</option>
          <option value="low">Estoque baixo</option>
        </select>

        {(search || categoryFilter || statusFilter) && (
          <button
            onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); setPage(1); }}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
          >
            <X size={13} /> Limpar
          </button>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setView('grid')}
            className={`p-2 rounded-lg transition-colors ${view === 'grid' ? 'bg-zinc-200 dark:bg-zinc-700' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
            <LayoutGrid size={16} className="dark:text-zinc-300" />
          </button>
          <button onClick={() => setView('list')}
            className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-zinc-200 dark:bg-zinc-700' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
            <List size={16} className="dark:text-zinc-300" />
          </button>
        </div>
      </div>

      {/* ── Products ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
          <Package size={48} strokeWidth={1} className="mb-4" />
          <p className="font-semibold text-lg dark:text-zinc-300">Nenhum produto encontrado</p>
          <p className="text-sm mt-1">Tente ajustar os filtros ou adicione um novo produto</p>
          <button
            onClick={() => { setEditProduct(null); setShowProduct(true); }}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-colors"
          >
            <Plus size={15} /> Adicionar primeiro produto
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(prod => {
            const status = stockStatus(prod);
            return (
              <div key={prod.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col group hover:border-emerald-500/50 hover:shadow-md transition-all">
                {/* Image */}
                <div className="h-36 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center p-3 relative">
                  {prod.image_url
                    ? <img src={prod.image_url} alt={prod.name} className="h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform duration-300" />
                    : <Package size={40} strokeWidth={1} className="text-zinc-300 dark:text-zinc-600" />
                  }
                  {/* Stock badge */}
                  <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    status === 'out' ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' :
                    status === 'low' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400' :
                    'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {status === 'out' ? 'SEM ESTOQUE' : status === 'low' ? 'ESTOQUE BAIXO' : 'OK'}
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div>
                    <div className="text-[10px] text-zinc-400 font-mono tracking-wider">SKU: {prod.sku}</div>
                    <h3 className="font-bold text-sm dark:text-white leading-tight mt-0.5 line-clamp-2">{prod.name}</h3>
                    {prod.category_name && (
                      <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{prod.category_name}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
                    <div>
                      <div className="text-[10px] text-zinc-400">Estoque</div>
                      <div className={`font-bold text-sm ${status === 'out' ? 'text-red-500' : status === 'low' ? 'text-amber-500' : 'dark:text-white'}`}>
                        {prod.stock_quantity} {prod.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-400">Venda</div>
                      <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{fmtBRL(prod.sale_price)}</div>
                    </div>
                  </div>

                  <div className="flex gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => setStockProduct(prod)}
                      className="flex-1 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center gap-1 transition-colors"
                    >
                      <BarChart2 size={12} /> Estoque
                    </button>
                    <button
                      onClick={() => { setEditProduct(prod); setShowProduct(true); }}
                      className="flex-1 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(prod)}
                      className="py-1.5 px-2.5 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-lg text-xs hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Produto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden md:table-cell">Categoria</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Estoque</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden sm:table-cell">Custo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Venda</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {products.map(prod => {
                const status = stockStatus(prod);
                return (
                  <tr key={prod.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                          {prod.image_url
                            ? <img src={prod.image_url} alt="" className="w-full h-full object-contain" />
                            : <Package size={18} className="text-zinc-400" />
                          }
                        </div>
                        <div>
                          <p className="font-semibold dark:text-white leading-tight">{prod.name}</p>
                          <p className="text-xs text-zinc-400 font-mono">{prod.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-zinc-500">{prod.category_name ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-bold ${status === 'out' ? 'text-red-500' : status === 'low' ? 'text-amber-500' : 'dark:text-white'}`}>
                        {prod.stock_quantity}
                      </span>
                      <span className="text-xs text-zinc-400 ml-1">{prod.unit}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                      <span className="text-zinc-500 text-xs">{fmtBRL(prod.cost_price)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmtBRL(prod.sale_price)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => setStockProduct(prod)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors" title="Ajustar estoque">
                          <BarChart2 size={14} />
                        </button>
                        <button onClick={() => { setEditProduct(prod); setShowProduct(true); }}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteConfirm(prod)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-colors" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:text-white"
          >
            Anterior
          </button>
          <span className="text-sm text-zinc-500 px-3">Página {page} de {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:text-white"
          >
            Próxima
          </button>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {showProduct && (
        <ProductModal
          product={editProduct}
          categories={categories}
          onClose={() => { setShowProduct(false); setEditProduct(null); }}
          onSave={loadData}
        />
      )}

      {stockProduct && (
        <StockAdjustModal product={stockProduct} onClose={() => setStockProduct(null)} onSave={loadData} />
      )}

      {showCategory && (
        <CategoryModal onClose={() => setShowCategory(false)} onSave={loadData} />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-center dark:text-white mb-1">Excluir produto?</h3>
            <p className="text-sm text-zinc-500 text-center mb-5">
              "<span className="font-semibold text-zinc-700 dark:text-zinc-300">{deleteConfirm.name}</span>" será desativado e removido do estoque.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
