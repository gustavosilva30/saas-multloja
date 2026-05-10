import { useState, useEffect, type ElementType } from 'react';
import { useTenant } from '../contexts/TenantContext';
import {
  Store, BarChart3, ShoppingCart, Box, Users, Wrench, Settings, Package,
  Megaphone, Smartphone, FileSearch, Ticket, Zap, Mic, Image as ImageIcon,
  MessageSquare, CalendarDays, Truck, ShieldCheck, CarFront, CreditCard,
  X, CheckCircle2, Clock, Loader2,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';

const MODULE_ICONS: Record<string, ElementType> = {
  dashboard: BarChart3, pos: ShoppingCart, stock: Box, customers: Users,
  finance: BarChart3, services: Wrench, catalog: FileSearch, events: Ticket,
  automations: Zap, ai_assistant: Mic, ecommerce: Store, marketing: Megaphone,
  delivery: Smartphone, image_editor: ImageIcon, messages: MessageSquare,
  calendar: CalendarDays, freight_quote: Truck, credit_check: ShieldCheck,
  plate_check: CarFront, bin_check: CreditCard, modules: Package, settings: Settings,
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

interface PixResult {
  payment_id: string;
  value: number;
  pix: { qr_code_image: string; copia_e_cola: string; expires_at: string };
}

// ── Pix Purchase Modal ────────────────────────────────────────────────────────

function PixModal({ pix, moduleName, onClose }: { pix: PixResult; moduleName: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(pix.pix.copia_e_cola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="font-bold text-zinc-900 dark:text-white">Pagar com Pix</h2>
            <p className="text-sm text-zinc-500">{moduleName} — R$ {Number(pix.value).toFixed(2).replace('.', ',')}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          {pix.pix.qr_code_image ? (
            <img
              src={`data:image/png;base64,${pix.pix.qr_code_image}`}
              alt="QR Code Pix"
              className="w-48 h-48 rounded-xl border border-zinc-200 dark:border-zinc-700"
            />
          ) : (
            <div className="w-48 h-48 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm text-center px-4">
              QR Code indisponível. Use o código abaixo.
            </div>
          )}

          <div className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-xs text-zinc-500 dark:text-zinc-400 font-mono break-all line-clamp-3">
            {pix.pix.copia_e_cola}
          </div>

          <button
            onClick={copy}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            {copied ? '✓ Copiado!' : 'Copiar código Pix'}
          </button>

          <p className="text-xs text-zinc-400 text-center flex items-center gap-1">
            <Clock size={12} /> Seu módulo será ativado automaticamente após o pagamento
          </p>
        </div>
      </div>
    </div>
  );
}

// ── CPF Modal for first-time buyers ──────────────────────────────────────────

function CpfModal({
  moduleName,
  onConfirm,
  onClose,
}: {
  moduleName: string;
  onConfirm: (cpfCnpj: string, phone: string) => void;
  onClose: () => void;
}) {
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="font-bold text-zinc-900 dark:text-white">Dados para cobrança</h2>
            <p className="text-sm text-zinc-500">{moduleName}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
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
            disabled={!cpf || !phone}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            Gerar Pix
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ModulesStore() {
  const { activeModules, toggleModule } = useTenant();
  const [catalog, setCatalog] = useState<CatalogModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [pixResult, setPixResult] = useState<{ data: PixResult; moduleName: string } | null>(null);
  const [needsCpf, setNeedsCpf] = useState<{ moduleId: string; moduleName: string } | null>(null);

  const token = () => localStorage.getItem('auth_token') || '';

  useEffect(() => {
    fetch(`${API}/api/modules/catalog`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { setCatalog(d.modules || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const purchase = async (moduleId: string, cpfCnpj?: string, mobilePhone?: string) => {
    setPurchasing(moduleId);
    setNeedsCpf(null);
    try {
      const body: Record<string, unknown> = {};
      if (cpfCnpj) body.cpfCnpj = cpfCnpj.replace(/\D/g, '');
      if (mobilePhone) body.mobilePhone = mobilePhone.replace(/\D/g, '');

      const res = await fetch(`${API}/api/modules/${moduleId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.status === 422 || data.error?.includes('CPF') || data.error?.includes('cpf')) {
        const mod = catalog.find(m => m.module_id === moduleId);
        setNeedsCpf({ moduleId, moduleName: mod?.name ?? '' });
        return;
      }

      if (!res.ok) { alert(data.error || 'Erro ao gerar cobrança'); return; }

      const mod = catalog.find(m => m.module_id === moduleId);
      setPixResult({ data, moduleName: mod?.name ?? moduleId });

      // Mark as pending locally
      setCatalog(prev => prev.map(m =>
        m.module_id === moduleId ? { ...m, payment_status: 'pending' } : m
      ));
    } catch {
      alert('Erro de conexão. Tente novamente.');
    } finally {
      setPurchasing(null);
    }
  };

  const statusBadge = (mod: CatalogModule) => {
    if (mod.is_free) return null;
    if (mod.payment_status === 'paid') return (
      <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
        <CheckCircle2 size={12} /> Ativo
      </div>
    );
    if (mod.payment_status === 'pending') return (
      <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
        <Clock size={12} /> Aguardando pagamento
      </div>
    );
    return null;
  };

  const actionButton = (mod: CatalogModule) => {
    const isActive = activeModules.includes(mod.module_id as never);

    if (mod.is_free) {
      return (
        <button
          onClick={() => toggleModule(mod.module_id as never)}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            isActive
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
        >
          {isActive ? 'Desativar' : 'Ativar'}
        </button>
      );
    }

    if (mod.payment_status === 'paid') {
      return (
        <span className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
          Ativo
        </span>
      );
    }

    if (mod.payment_status === 'pending') {
      return (
        <button
          onClick={() => purchase(mod.module_id)}
          disabled={purchasing === mod.module_id}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {purchasing === mod.module_id ? <Loader2 size={14} className="animate-spin" /> : null}
          Ver Pix
        </button>
      );
    }

    return (
      <button
        onClick={() => purchase(mod.module_id)}
        disabled={purchasing === mod.module_id}
        className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
      >
        {purchasing === mod.module_id ? <Loader2 size={14} className="animate-spin" /> : null}
        Assinar
      </button>
    );
  };

  const fmtPrice = (mod: CatalogModule) => {
    if (mod.is_free) return 'Gratuito';
    return `R$ ${Number(mod.price).toFixed(2).replace('.', ',')} /mês`;
  };

  return (
    <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-500 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Marketplace de Módulos</h2>
          <p className="text-emerald-100 max-w-xl text-sm leading-relaxed">
            Adapte o sistema às necessidades do seu negócio. Ative módulos gratuitos na hora ou assine módulos premium via Pix.
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

            return (
              <div key={mod.module_id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col p-5 shadow-sm hover:shadow-md transition-shadow relative">
                {isPremium && (
                  <div className="absolute top-0 right-5 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full shadow-sm">
                    Premium
                  </div>
                )}

                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive || mod.payment_status === 'paid'
                      ? 'bg-emerald-500 text-white'
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
                    {statusBadge(mod)}
                  </div>
                  {actionButton(mod)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {needsCpf && (
        <CpfModal
          moduleName={needsCpf.moduleName}
          onClose={() => setNeedsCpf(null)}
          onConfirm={(cpf, phone) => purchase(needsCpf.moduleId, cpf, phone)}
        />
      )}

      {pixResult && (
        <PixModal
          pix={pixResult.data}
          moduleName={pixResult.moduleName}
          onClose={() => setPixResult(null)}
        />
      )}
    </div>
  );
}
