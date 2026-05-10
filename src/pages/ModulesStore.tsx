import { useState, useEffect, type ElementType } from 'react';
import { useTenant } from '../contexts/TenantContext';
import {
  Store, BarChart3, ShoppingCart, Box, Users, Wrench, Settings, Package,
  Megaphone, Smartphone, FileSearch, Ticket, Zap, Mic, Image as ImageIcon,
  MessageSquare, CalendarDays, Truck, ShieldCheck, CarFront, CreditCard,
  X, CheckCircle2, Clock, Loader2, ShoppingBag, Check,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';

const MODULE_ICONS: Record<string, ElementType> = {
  dashboard: BarChart3, pos: ShoppingCart, stock: Box, customers: Users,
  finance: BarChart3, services: Wrench, catalog: FileSearch, events: Ticket,
  automations: Zap, ai_assistant: Mic, ecommerce: Store, marketing: Megaphone,
  delivery: Smartphone, image_editor: ImageIcon, messages: MessageSquare,
  calendar: CalendarDays, freight_quote: Truck, credit_check: ShieldCheck,
  plate_check: CarFront, bin_check: CreditCard, modules: Package, settings: Settings,
  whatsapp_integration: Phone,
};

interface CatalogModule {
  module_id: string;
  name: string;
  description: string;
  category: string;
  price: string;
  is_free: boolean;
  is_active: boolean;
  sort_order: number;
  payment_status: 'free' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  asaas_payment_id: string | null;
}

interface BundlePixResult {
  payment_id: string;
  value: number;
  modules: { module_id: string; name: string; price: number }[];
  pix: { qr_code_image: string; copia_e_cola: string; expires_at: string };
}

// ── Pix Modal ─────────────────────────────────────────────────────────────────

function PixModal({ result, onClose }: { result: BundlePixResult; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(result.pix.copia_e_cola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmtBRL = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="font-bold text-zinc-900 dark:text-white">Pagar com Pix</h2>
            <p className="text-sm text-zinc-500">
              {result.modules.length === 1
                ? result.modules[0].name
                : `${result.modules.length} módulos`}
              {' '}— {fmtBRL(result.value)}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          {/* Módulos incluídos */}
          {result.modules.length > 1 && (
            <div className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 space-y-1">
              {result.modules.map(m => (
                <div key={m.module_id} className="flex justify-between text-xs text-zinc-600 dark:text-zinc-300">
                  <span>{m.name}</span>
                  <span className="font-semibold">{fmtBRL(m.price)}/mês</span>
                </div>
              ))}
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-1 mt-1 flex justify-between text-sm font-bold text-zinc-900 dark:text-white">
                <span>Total</span>
                <span>{fmtBRL(result.value)}</span>
              </div>
            </div>
          )}

          {result.pix.qr_code_image ? (
            <img
              src={`data:image/png;base64,${result.pix.qr_code_image}`}
              alt="QR Code Pix"
              className="w-44 h-44 rounded-xl border border-zinc-200 dark:border-zinc-700"
            />
          ) : (
            <div className="w-44 h-44 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm text-center px-4">
              Use o código abaixo
            </div>
          )}

          <div className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-xs text-zinc-500 dark:text-zinc-400 font-mono break-all line-clamp-3">
            {result.pix.copia_e_cola}
          </div>

          <button
            onClick={copy}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            {copied ? '✓ Copiado!' : 'Copiar código Pix'}
          </button>

          <p className="text-xs text-zinc-400 text-center flex items-center gap-1">
            <Clock size={12} /> Módulos ativados automaticamente após o pagamento
          </p>
        </div>
      </div>
    </div>
  );
}

// ── CPF Modal ─────────────────────────────────────────────────────────────────

function CpfModal({
  moduleCount,
  totalValue,
  onConfirm,
  onClose,
  loading,
}: {
  moduleCount: number;
  totalValue: number;
  onConfirm: (cpf: string, phone: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="font-bold text-zinc-900 dark:text-white">Dados para cobrança</h2>
            <p className="text-sm text-zinc-500">
              {moduleCount} módulo{moduleCount > 1 ? 's' : ''} — R$ {totalValue.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Necessário apenas no primeiro pagamento para cadastro no gateway.
          </p>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">CPF ou CNPJ</label>
            <input
              value={cpf} onChange={e => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Celular (com DDD)</label>
            <input
              value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 dark:text-white"
            />
          </div>
          <button
            onClick={() => { if (cpf && phone) onConfirm(cpf, phone); }}
            disabled={!cpf || !phone || loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Gerar Pix
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cart Bar ──────────────────────────────────────────────────────────────────

function CartBar({
  selected,
  catalog,
  onCheckout,
  onClear,
  loading,
}: {
  selected: Set<string>;
  catalog: CatalogModule[];
  onCheckout: () => void;
  onClear: () => void;
  loading: boolean;
}) {
  if (selected.size === 0) return null;

  const total = catalog
    .filter(m => selected.has(m.module_id))
    .reduce((sum, m) => sum + Number(m.price), 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl shadow-2xl border border-zinc-700 px-5 py-4 flex items-center gap-4 pointer-events-auto max-w-lg w-full">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">
            {selected.size} módulo{selected.size > 1 ? 's' : ''} selecionado{selected.size > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-zinc-400">
            Total: <span className="text-emerald-400 font-bold">R$ {total.toFixed(2).replace('.', ',')}/mês</span>
          </p>
        </div>
        <button
          onClick={onClear}
          className="text-zinc-400 hover:text-white text-xs underline shrink-0"
        >
          Limpar
        </button>
        <button
          onClick={onCheckout}
          disabled={loading}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2 shrink-0"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <ShoppingBag size={15} />}
          Pagar com Pix
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ModulesStore() {
  const { activeModules, toggleModule } = useTenant();
  const [catalog, setCatalog] = useState<CatalogModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Multi-select state
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modal states
  const [pixResult, setPixResult] = useState<BundlePixResult | null>(null);
  const [showCpf, setShowCpf] = useState(false);

  const token = () => localStorage.getItem('auth_token') || '';

  useEffect(() => {
    fetch(`${API}/api/modules/catalog`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { setCatalog(d.modules || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleSelect = (moduleId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const checkout = async (cpfCnpj?: string, mobilePhone?: string) => {
    setCheckoutLoading(true);
    setShowCpf(false);
    try {
      const body: Record<string, unknown> = { moduleIds: Array.from(selected) };
      if (cpfCnpj) body.cpfCnpj = cpfCnpj.replace(/\D/g, '');
      if (mobilePhone) body.mobilePhone = mobilePhone.replace(/\D/g, '');

      const res = await fetch(`${API}/api/modules/purchase-bundle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.status === 422) { setShowCpf(true); setCheckoutLoading(false); return; }
      if (!res.ok) { alert(data.error || 'Erro ao gerar cobrança'); setCheckoutLoading(false); return; }

      // Mark selected as pending locally
      const purchasedIds = new Set((data.modules as { module_id: string }[]).map(m => m.module_id));
      setCatalog(prev => prev.map(m =>
        purchasedIds.has(m.module_id) ? { ...m, payment_status: 'pending' as const } : m
      ));
      setSelected(new Set());
      setPixResult(data as BundlePixResult);
    } catch {
      alert('Erro de conexão. Tente novamente.');
    }
    setCheckoutLoading(false);
  };

  const totalSelected = catalog
    .filter(m => selected.has(m.module_id))
    .reduce((sum, m) => sum + Number(m.price), 0);

  const fmtPrice = (mod: CatalogModule) =>
    mod.is_free ? 'Gratuito' : `R$ ${Number(mod.price).toFixed(2).replace('.', ',')} /mês`;

  return (
    <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-500 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Marketplace de Módulos</h2>
          <p className="text-emerald-100 max-w-xl text-sm leading-relaxed">
            Selecione os módulos que deseja contratar e pague tudo de uma vez com um único Pix.
          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-emerald-600/50 to-transparent" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {catalog.map(mod => {
            const Icon = MODULE_ICONS[mod.module_id] ?? Package;
            const isActive = activeModules.includes(mod.module_id as never);
            const isPremium = !mod.is_free;
            const isPaid = mod.payment_status === 'paid';
            const isPending = mod.payment_status === 'pending';
            const isSelected = selected.has(mod.module_id);
            const isSelectable = isPremium && !isPaid && !isPending;

            return (
              <div
                key={mod.module_id}
                onClick={() => isSelectable && toggleSelect(mod.module_id)}
                className={`bg-white dark:bg-zinc-900 border rounded-2xl flex flex-col p-5 shadow-sm transition-all relative
                  ${isSelectable ? 'cursor-pointer hover:shadow-md' : ''}
                  ${isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                    : 'border-zinc-200 dark:border-zinc-800 hover:shadow-md'
                  }`}
              >
                {/* Premium badge */}
                {isPremium && !isPaid && (
                  <div className="absolute top-0 right-5 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full shadow-sm">
                    Premium
                  </div>
                )}

                {/* Selection checkbox (premium only, not paid) */}
                {isSelectable && (
                  <div className={`absolute top-3 left-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                    ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900'}`}>
                    {isSelected && <Check size={11} strokeWidth={3} className="text-white" />}
                  </div>
                )}

                <div className={`flex items-start gap-4 mb-4 ${isSelectable ? 'pl-4' : ''}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive || isPaid
                      ? 'bg-emerald-500 text-white'
                      : isSelected
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}>
                    <Icon size={24} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="font-bold text-zinc-900 dark:text-white leading-tight line-clamp-1">{mod.name}</h3>
                    <span className="text-xs font-semibold text-zinc-400">{mod.category}</span>
                  </div>
                </div>

                <p className="text-sm text-zinc-500 dark:text-zinc-400 flex-1 mb-6 leading-relaxed line-clamp-3">
                  {mod.description}
                </p>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between mt-auto gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold dark:text-white">{fmtPrice(mod)}</div>
                    {isPaid && (
                      <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                        <CheckCircle2 size={12} /> Ativo
                      </div>
                    )}
                    {isPending && (
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
                        <Clock size={12} /> Aguardando Pix
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  {mod.is_free ? (
                    <button
                      onClick={e => { e.stopPropagation(); toggleModule(mod.module_id as never); }}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                        isActive
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      }`}
                    >
                      {isActive ? 'Desativar' : 'Ativar'}
                    </button>
                  ) : isPaid ? (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      Ativo
                    </span>
                  ) : isPending ? (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Clock size={11} /> Pendente
                    </span>
                  ) : (
                    <div
                      onClick={e => { e.stopPropagation(); toggleSelect(mod.module_id); }}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isSelected ? '✓ Selecionado' : 'Selecionar'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart bar */}
      <CartBar
        selected={selected}
        catalog={catalog}
        onCheckout={() => checkout()}
        onClear={() => setSelected(new Set())}
        loading={checkoutLoading}
      />

      {/* CPF modal */}
      {showCpf && (
        <CpfModal
          moduleCount={selected.size}
          totalValue={totalSelected}
          onClose={() => setShowCpf(false)}
          onConfirm={(cpf, phone) => checkout(cpf, phone)}
          loading={checkoutLoading}
        />
      )}

      {/* Pix modal */}
      {pixResult && (
        <PixModal
          result={pixResult}
          onClose={() => setPixResult(null)}
        />
      )}
    </div>
  );
}
