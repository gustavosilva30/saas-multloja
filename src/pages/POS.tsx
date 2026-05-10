import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import {
  Search, Plus, Minus, Trash2, X, ShoppingCart, Package,
  CreditCard, Banknote, QrCode, Receipt, User, Check,
  AlertCircle, Barcode, FileCheck2, Wallet, FileBadge,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';
const token = () => localStorage.getItem('auth_token') || '';

const apiFetch = async <T,>(path: string, opts: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${API}${path}`, {
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

interface Product {
  id: string;
  name: string;
  sku: string;
  sale_price: number;
  stock_quantity: number;
  unit: string;
  image_url?: string;
  category_name?: string;
  is_active: boolean;
}

interface Customer { id: string; name: string; document?: string; phone?: string; }

interface CartItem {
  product: Product;
  quantity: number;
}

type PaymentMethod = 'cash' | 'debit_card' | 'credit_card' | 'pix' | 'boleto' | 'cheque' | 'customer_credit' | 'internal_credit';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: typeof CreditCard; needsCustomer?: true }[] = [
  { id: 'cash',            label: 'Dinheiro',        icon: Banknote },
  { id: 'debit_card',      label: 'Déb. Cartão',     icon: CreditCard },
  { id: 'credit_card',     label: 'Créd. Cartão',    icon: CreditCard },
  { id: 'pix',             label: 'Pix',             icon: QrCode },
  { id: 'boleto',          label: 'Boleto',          icon: Barcode },
  { id: 'cheque',          label: 'Cheque',          icon: FileCheck2 },
  { id: 'customer_credit', label: 'Haver Cliente',   icon: Wallet,    needsCustomer: true },
  { id: 'internal_credit', label: 'Nota Créd.',      icon: FileBadge },
];

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── Customer Picker Modal ─────────────────────────────────────────────────────

function CustomerPicker({ onClose, onSelect }: { onClose: () => void; onSelect: (c: Customer | null) => void }) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ customers: Customer[] }>(`/api/customers?limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`)
      .then(d => setCustomers(d.customers))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h3 className="font-semibold text-zinc-800">Selecionar Cliente</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
        </div>
        <div className="p-4 border-b border-zinc-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              autoFocus
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou CPF/CNPJ"
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <button
            onClick={() => onSelect(null)}
            className="w-full text-left px-5 py-3 hover:bg-zinc-50 border-b border-zinc-100"
          >
            <p className="text-sm font-medium text-zinc-700">Consumidor Final</p>
            <p className="text-xs text-zinc-400">Venda sem identificar cliente</p>
          </button>
          {loading ? (
            <p className="text-sm text-zinc-400 text-center py-6">Carregando…</p>
          ) : customers.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-6">Nenhum cliente encontrado</p>
          ) : customers.map(c => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="w-full text-left px-5 py-3 hover:bg-zinc-50 border-b border-zinc-100"
            >
              <p className="text-sm font-medium text-zinc-800">{c.name}</p>
              {(c.document || c.phone) && (
                <p className="text-xs text-zinc-500">{c.document}{c.document && c.phone ? ' · ' : ''}{c.phone}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sale Success Modal ────────────────────────────────────────────────────────

function SuccessModal({ total, onClose }: { total: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-emerald-600" strokeWidth={3} />
        </div>
        <h3 className="font-bold text-lg text-zinc-800 mb-1">Venda Realizada!</h3>
        <p className="text-sm text-zinc-500 mb-1">Total recebido</p>
        <p className="text-3xl font-bold text-emerald-600 mb-6">{fmtBRL(total)}</p>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
        >
          Nova Venda
        </button>
      </div>
    </div>
  );
}

// ── POS Main ──────────────────────────────────────────────────────────────────

export function POS() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [discount, setDiscount] = useState(0);
  const [discountMode, setDiscountMode] = useState<'value' | 'percent'>('value');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successTotal, setSuccessTotal] = useState<number | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 250);
  }, [search]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60', is_active: 'true' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const { products } = await apiFetch<{ products: Product[] }>(`/api/products?${params}`);
      setProducts(products);
    } catch { /* ignore */ }
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const addToCart = (p: Product) => {
    if (p.stock_quantity <= 0) { setError(`${p.name} está sem estoque`); setTimeout(() => setError(''), 2500); return; }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === p.id);
      if (existing) {
        if (existing.quantity >= p.stock_quantity) {
          setError(`Estoque máximo de ${p.name} atingido`); setTimeout(() => setError(''), 2500);
          return prev;
        }
        return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product: p, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) =>
    setCart(prev => prev.flatMap(i => {
      if (i.product.id !== id) return [i];
      const newQty = i.quantity + delta;
      if (newQty <= 0) return [];
      if (newQty > i.product.stock_quantity) {
        setError(`Estoque máximo: ${i.product.stock_quantity}`); setTimeout(() => setError(''), 2500);
        return [i];
      }
      return [{ ...i, quantity: newQty }];
    }));

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id));

  const subtotal = cart.reduce((s, i) => s + i.product.sale_price * i.quantity, 0);
  const discountValue = discountMode === 'percent' ? (subtotal * discount) / 100 : discount;
  const total = Math.max(0, subtotal - discountValue);

  const finalize = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (paymentMethod === 'customer_credit' && !customer) {
      setError('Selecione um cliente para usar Haver Cliente'); return;
    }
    setSubmitting(true);
    setError('');
    try {
      const body = {
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.sale_price })),
        customer_id: customer?.id,
        payment_method: paymentMethod,
        discount: discountValue,
      };
      await apiFetch('/api/sales', { method: 'POST', body: JSON.stringify(body) });
      setSuccessTotal(total);
      setCart([]);
      setDiscount(0);
      setCustomer(null);
      loadProducts(); // refresh stock
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar venda');
    }
    setSubmitting(false);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row bg-zinc-50">
      {/* ── Left: products grid ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col p-5 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-800">PDV</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Operador: {user?.full_name ?? 'Usuário'}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            autoFocus
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, SKU ou código de barras"
            className="w-full pl-10 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 placeholder:text-zinc-400"
          />
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
              <Package size={36} className="mb-3 opacity-40" />
              <p className="text-sm">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map(p => {
                const outOfStock = p.stock_quantity <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock}
                    className={cn(
                      'group relative bg-white rounded-xl border border-zinc-200 hover:border-emerald-400 hover:shadow-md transition-all overflow-hidden flex flex-col text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-zinc-200 disabled:hover:shadow-none'
                    )}
                  >
                    <div className="relative bg-zinc-50 aspect-square">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                        : <div className="w-full h-full flex items-center justify-center"><Package size={32} className="text-zinc-300" /></div>
                      }
                      {outOfStock && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-medium">
                          Esgotado
                        </span>
                      )}
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-white/95 text-zinc-700 text-[10px] font-medium border border-zinc-200">
                        {p.stock_quantity} {p.unit}
                      </span>
                    </div>
                    <div className="p-2.5 flex-1 flex flex-col">
                      <p className="text-[10px] text-zinc-400 mb-0.5">{p.sku}</p>
                      <p className="text-xs font-medium text-zinc-800 line-clamp-2 leading-snug mb-1.5">{p.name}</p>
                      <p className="text-sm font-bold text-emerald-600 mt-auto">{fmtBRL(p.sale_price)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: cart ─────────────────────────────────────────────────────── */}
      <aside className="w-full lg:w-96 bg-white border-l border-zinc-200 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-zinc-800">Venda Atual</h3>
            {cart.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => { setCart([]); setDiscount(0); setCustomer(null); }}
              className="text-xs text-zinc-400 hover:text-red-500"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Customer */}
        <button
          onClick={() => setShowCustomerPicker(true)}
          className="flex items-center gap-2 px-5 py-2.5 border-b border-zinc-100 text-sm hover:bg-zinc-50 text-left"
        >
          <User size={14} className="text-zinc-400" />
          {customer ? (
            <>
              <span className="font-medium text-zinc-800 flex-1 truncate">{customer.name}</span>
              <span onClick={e => { e.stopPropagation(); setCustomer(null); }} className="text-xs text-zinc-400 hover:text-red-500"><X size={14} /></span>
            </>
          ) : (
            <span className="text-zinc-500">Consumidor Final</span>
          )}
        </button>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-300 px-6 text-center">
              <ShoppingCart size={40} className="mb-3 opacity-50" />
              <p className="text-sm font-medium text-zinc-500">Carrinho vazio</p>
              <p className="text-xs text-zinc-400 mt-1">Clique em um produto para adicionar</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {cart.map(({ product, quantity }) => (
                <li key={product.id} className="px-4 py-3 flex gap-3">
                  <div className="w-12 h-12 rounded-lg bg-zinc-50 border border-zinc-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {product.image_url
                      ? <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                      : <Package size={16} className="text-zinc-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 line-clamp-1">{product.name}</p>
                    <p className="text-xs text-zinc-400 mb-1.5">{fmtBRL(product.sale_price)} × {quantity}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-md">
                        <button onClick={() => updateQuantity(product.id, -1)} className="p-1 text-zinc-500 hover:text-zinc-800">
                          <Minus size={12} />
                        </button>
                        <span className="px-2 text-xs font-bold w-7 text-center">{quantity}</span>
                        <button onClick={() => updateQuantity(product.id, 1)} className="p-1 text-zinc-500 hover:text-zinc-800">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-zinc-800">{fmtBRL(product.sale_price * quantity)}</span>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(product.id)} className="text-zinc-300 hover:text-red-500 self-start p-1">
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer: discount + payment + total */}
        {cart.length > 0 && (
          <form onSubmit={finalize} className="border-t border-zinc-200 bg-white p-4 space-y-3">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Discount */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-zinc-600 shrink-0">Desconto</label>
              <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-md overflow-hidden flex-1">
                <input
                  type="number" min="0" step="0.01"
                  value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-transparent px-2 py-1.5 text-sm focus:outline-none w-0"
                />
                <button
                  type="button"
                  onClick={() => setDiscountMode('value')}
                  className={cn('px-2 py-1.5 text-xs font-bold border-l border-zinc-200', discountMode === 'value' ? 'bg-emerald-500 text-white' : 'text-zinc-500 hover:bg-zinc-100')}
                >
                  R$
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountMode('percent')}
                  className={cn('px-2 py-1.5 text-xs font-bold border-l border-zinc-200', discountMode === 'percent' ? 'bg-emerald-500 text-white' : 'text-zinc-500 hover:bg-zinc-100')}
                >
                  %
                </button>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span><span>{fmtBRL(subtotal)}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between text-zinc-500">
                  <span>Desconto</span><span>- {fmtBRL(discountValue)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-zinc-900 text-lg pt-1 border-t border-zinc-100">
                <span>Total</span><span className="text-emerald-600">{fmtBRL(total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <p className="text-xs font-medium text-zinc-600 mb-1.5">Forma de Pagamento</p>
              <div className="grid grid-cols-4 gap-1.5">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.id} type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-[10px] font-medium transition-colors leading-tight',
                      paymentMethod === m.id
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                    )}
                  >
                    <m.icon size={14} />
                    <span className="text-center">{m.label}</span>
                  </button>
                ))}
              </div>
              {paymentMethod === 'customer_credit' && !customer && (
                <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={10} /> Selecione um cliente para usar Haver Cliente
                </p>
              )}
            </div>

            <button
              type="submit" disabled={submitting}
              className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <Receipt size={16} />
              {submitting ? 'Processando…' : `Finalizar Venda · ${fmtBRL(total)}`}
            </button>
          </form>
        )}
      </aside>

      {showCustomerPicker && (
        <CustomerPicker
          onClose={() => setShowCustomerPicker(false)}
          onSelect={c => { setCustomer(c); setShowCustomerPicker(false); }}
        />
      )}

      {successTotal !== null && (
        <SuccessModal total={successTotal} onClose={() => setSuccessTotal(null)} />
      )}
    </div>
  );
}
