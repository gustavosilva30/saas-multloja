import { useState, useEffect, FormEvent, type CSSProperties, type ElementType, type ChangeEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Store, Mail, Lock, User, Building2, Car, Scissors,
  UtensilsCrossed, Pill, ShoppingBag, ShoppingCart, Package,
  BarChart3, Users, Truck, Zap, Globe,
  ArrowLeft, CheckCircle2, ChevronRight,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';

interface NicheTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  form_schema: unknown[];
}

const NICHE_META: Record<string, { icon: ElementType; color: string; bg: string }> = {
  auto_pecas:   { icon: Car,             color: '#f59e0b', bg: '#f59e0b18' },
  barbearia:    { icon: Scissors,        color: '#8b5cf6', bg: '#8b5cf618' },
  vestuario:    { icon: ShoppingBag,     color: '#ec4899', bg: '#ec489918' },
  restaurante:  { icon: UtensilsCrossed, color: '#ef4444', bg: '#ef444418' },
  farmacia:     { icon: Pill,            color: '#10b981', bg: '#10b98118' },
  varejo_geral: { icon: Store,           color: '#4f8ef7', bg: '#4f8ef718' },
};

const FALLBACK_ICONS = [ShoppingCart, Package, BarChart3, Users, Truck, Zap, Globe];
const FALLBACK_COLORS = ['#4f8ef7', '#7c4dff', '#00c896', '#ff6b35', '#f59e0b', '#ec4899', '#10b981'];

function getNicheMeta(slug: string, index: number) {
  if (NICHE_META[slug]) return NICHE_META[slug];
  return {
    icon: FALLBACK_ICONS[index % FALLBACK_ICONS.length],
    color: FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    bg: `${FALLBACK_COLORS[index % FALLBACK_COLORS.length]}18`,
  };
}

interface Props {
  onSwitchToLogin: () => void;
}

export function Register({ onSwitchToLogin }: Props) {
  const { signUp } = useAuth();
  const [step, setStep] = useState<'niche' | 'form'>('niche');
  const [niches, setNiches] = useState<NicheTemplate[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<NicheTemplate | null>(null);
  const [form, setForm] = useState({ full_name: '', tenant_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/niches/public`)
      .then(r => r.json())
      .then(d => setNiches(d.niches || []))
      .catch(() => setNiches([]));
  }, []);

  const set = (field: string) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signUp(form.email, form.password, {
      full_name: form.full_name,
      tenant_name: form.tenant_name,
      niche: selectedNiche?.slug || 'outros',
      niche_template_id: selectedNiche?.id,
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  const glassCard: CSSProperties = {
    background: 'rgba(255,255,255,0.055)',
    backdropFilter: 'blur(28px)',
    border: '1.5px solid rgba(255,255,255,0.11)',
  };

  const inputStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.07)',
    border: '1.5px solid rgba(255,255,255,0.1)',
  };

  const selectedMeta = selectedNiche ? getNicheMeta(selectedNiche.slug, 0) : null;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #050d2e 0%, #0b1848 45%, #12054a 100%)' }}
    >
      <div className="w-full max-w-[460px]">

        {/* ── STEP 1: Niche selection ─────────────────────────────────── */}
        {step === 'niche' && (
          <div className="rounded-3xl p-8 shadow-2xl" style={glassCard}>
            {/* Header */}
            <div className="text-center mb-7">
              <div className="inline-flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c4dff)' }}>
                  <Store size={22} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-black text-xl leading-none tracking-[0.2em] uppercase">Multiloja</p>
                  <p className="text-xs font-bold tracking-[0.25em] uppercase mt-0.5" style={{ color: '#4f8ef7' }}>SaaS</p>
                </div>
              </div>

              {/* Steps indicator */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: '#4f8ef7' }}>1</div>
                  <span className="text-xs font-semibold" style={{ color: '#4f8ef7' }}>Ramo</span>
                </div>
                <div className="w-8 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>2</div>
                  <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>Dados</span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-white">Qual é o ramo do seu negócio?</h2>
              <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Vamos configurar o sistema do jeito certo para você
              </p>
            </div>

            {/* Niche grid */}
            {niches.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {niches.map((n, i) => {
                  const meta = getNicheMeta(n.slug, i);
                  const Icon = meta.icon;
                  const isSelected = selectedNiche?.id === n.id;
                  return (
                    <button
                      key={n.id}
                      onClick={() => setSelectedNiche(isSelected ? null : n)}
                      className="group flex items-center gap-3 rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        background: isSelected ? `${meta.color}28` : meta.bg,
                        border: `1.5px solid ${isSelected ? meta.color : meta.color + '30'}`,
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${meta.color}20` }}>
                        {isSelected
                          ? <CheckCircle2 size={20} color={meta.color} />
                          : <Icon size={20} color={meta.color} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-tight">{n.name}</p>
                        {n.description && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {n.description}
                          </p>
                        )}
                      </div>
                      {isSelected
                        ? <CheckCircle2 size={14} color={meta.color} className="shrink-0" />
                        : <ChevronRight size={14} className="shrink-0 opacity-40 group-hover:opacity-70 transition-opacity" color={meta.color} />
                      }
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setStep('form')}
              disabled={niches.length === 0}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white uppercase tracking-[0.15em] transition-all disabled:opacity-40"
              style={{ background: selectedNiche ? 'linear-gradient(135deg, #1a3fb5, #4f8ef7)' : 'rgba(255,255,255,0.1)' }}
            >
              {selectedNiche ? `Continuar com ${selectedNiche.name}` : 'Selecione um ramo para continuar'}
            </button>

            {selectedNiche && (
              <button
                onClick={() => { setSelectedNiche(null); setStep('form'); }}
                className="w-full mt-2 py-2.5 text-xs text-center transition-opacity hover:opacity-60"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Continuar sem selecionar
              </button>
            )}

            <p className="text-center text-sm mt-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Já tem conta?{' '}
              <button onClick={onSwitchToLogin} className="font-bold hover:underline" style={{ color: '#4f8ef7' }}>
                Entrar
              </button>
            </p>
          </div>
        )}

        {/* ── STEP 2: Registration form ───────────────────────────────── */}
        {step === 'form' && (
          <div className="rounded-3xl p-9 shadow-2xl" style={glassCard}>
            {/* Back + steps */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => { setStep('niche'); setError(''); }}
                className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                <ArrowLeft size={13} /> Voltar
              </button>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(79,142,247,0.2)', border: '1px solid #4f8ef750' }}>
                    <CheckCircle2 size={12} color="#4f8ef7" />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: '#4f8ef780' }}>Ramo</span>
                </div>
                <div className="w-8 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: '#4f8ef7' }}>2</div>
                  <span className="text-xs font-semibold" style={{ color: '#4f8ef7' }}>Dados</span>
                </div>
              </div>
            </div>

            {/* Logo + niche badge */}
            <div className="text-center mb-7">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c4dff)' }}>
                  <Store size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-black text-lg leading-none tracking-[0.2em] uppercase">Multiloja</p>
                  <p className="text-xs font-bold tracking-[0.25em] uppercase mt-0.5" style={{ color: '#4f8ef7' }}>SaaS</p>
                </div>
              </div>

              {selectedNiche && selectedMeta && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3"
                  style={{ background: `${selectedMeta.color}18`, border: `1px solid ${selectedMeta.color}40` }}>
                  <CheckCircle2 size={13} color={selectedMeta.color} />
                  <span className="text-sm font-semibold" style={{ color: selectedMeta.color }}>
                    {selectedNiche.name}
                  </span>
                </div>
              )}

              <h2 className="text-xl font-bold text-white">Crie sua conta grátis</h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Configure sua loja em menos de 1 minuto
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="rounded-xl px-4 py-3 text-sm text-red-300 text-center"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              <div className="relative">
                <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.35)' }} />
                <input
                  type="text"
                  value={form.full_name}
                  onChange={set('full_name')}
                  required minLength={2}
                  placeholder="Seu nome completo"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#4f8ef7')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <div className="relative">
                <Building2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.35)' }} />
                <input
                  type="text"
                  value={form.tenant_name}
                  onChange={set('tenant_name')}
                  required minLength={2}
                  placeholder="Nome da sua empresa / loja"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#4f8ef7')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.35)' }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  required
                  placeholder="Seu e-mail"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#4f8ef7')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.35)' }} />
                <input
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  required minLength={6}
                  placeholder="Senha (mín. 6 caracteres)"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#4f8ef7')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-black text-sm text-white uppercase tracking-[0.15em] transition-opacity disabled:opacity-50 mt-1"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
              >
                {loading ? 'Criando sua conta...' : 'Criar conta grátis'}
              </button>

              <p className="text-center text-sm pt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Já tem conta?{' '}
                <button type="button" onClick={onSwitchToLogin} className="font-bold hover:underline" style={{ color: '#4f8ef7' }}>
                  Entrar
                </button>
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
