import { useState, useEffect, FormEvent, type CSSProperties, type ElementType } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Mail, Lock, Store, BarChart3, Package, Users, Truck, Zap,
  ShoppingCart, Globe, Car, Scissors, UtensilsCrossed, Pill,
  ShoppingBag, ArrowLeft, CheckCircle2, ChevronRight,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';

interface NicheTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  form_schema: unknown[];
}

// Map slug → lucide icon + color
const NICHE_META: Record<string, { icon: ElementType; color: string; bg: string }> = {
  auto_pecas:   { icon: Car,              color: '#f59e0b', bg: '#f59e0b18' },
  barbearia:    { icon: Scissors,         color: '#8b5cf6', bg: '#8b5cf618' },
  vestuario:    { icon: ShoppingBag,      color: '#ec4899', bg: '#ec489918' },
  restaurante:  { icon: UtensilsCrossed,  color: '#ef4444', bg: '#ef444418' },
  farmacia:     { icon: Pill,             color: '#10b981', bg: '#10b98118' },
  varejo_geral: { icon: Store,            color: '#4f8ef7', bg: '#4f8ef718' },
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
  onSwitchToRegister: () => void;
}

// ── Background illustration ───────────────────────────────────────────────────
function BackgroundGrid() {
  const gridItems = [
    { Icon: ShoppingCart, label: 'PDV',       color: '#4f8ef7', x: 90,  y: 70  },
    { Icon: Package,      label: 'Estoque',   color: '#7c4dff', x: 250, y: 70  },
    { Icon: BarChart3,    label: 'Financeiro',color: '#00c896', x: 410, y: 70  },
    { Icon: Users,        label: 'Clientes',  color: '#ff6b35', x: 90,  y: 210 },
    { Icon: Store,        label: 'Multi-Loja',color: '#4f8ef7', x: 250, y: 210, large: true },
    { Icon: Globe,        label: 'E-commerce',color: '#7c4dff', x: 410, y: 210 },
    { Icon: Truck,        label: 'Entregas',  color: '#00c896', x: 90,  y: 350 },
    { Icon: Zap,          label: 'Automação', color: '#ff6b35', x: 250, y: 350 },
    { Icon: BarChart3,    label: 'Relatórios',color: '#4f8ef7', x: 410, y: 350 },
  ];

  return (
    <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative px-10">
      <div className="relative z-10 text-center mb-10">
        <h1 className="text-4xl font-black text-white leading-tight uppercase tracking-wide">
          Gerencie Múltiplas Lojas<br />
          <span style={{ color: '#4f8ef7' }}>com Eficiência Centralizada</span>
        </h1>
      </div>
      <div className="relative w-full max-w-lg" style={{ height: 420 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 420" fill="none">
          {[90, 250, 410].map(x => [70, 210, 350].map(y => (
            <circle key={`d-${x}-${y}`} cx={x} cy={y} r="3" fill="#4f8ef7" opacity="0.5" />
          )))}
          {[90, 250, 410].map(x => (
            <line key={`v-${x}`} x1={x} y1={70} x2={x} y2={350} stroke="#4f8ef720" strokeWidth="1.5" strokeDasharray="4 4" />
          ))}
          {[70, 210, 350].map(y => (
            <line key={`h-${y}`} x1={90} y1={y} x2={410} y2={y} stroke="#4f8ef720" strokeWidth="1.5" strokeDasharray="4 4" />
          ))}
        </svg>
        {gridItems.map(({ Icon, label, color, x, y, large }) => (
          <div key={label} className="absolute flex flex-col items-center gap-1.5"
            style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}>
            <div className="rounded-2xl flex items-center justify-center shadow-lg"
              style={{ width: large ? 66 : 50, height: large ? 66 : 50, background: `${color}1a`, border: `1.5px solid ${color}44`, backdropFilter: 'blur(8px)' }}>
              <Icon size={large ? 30 : 22} color={color} />
            </div>
            <span className="text-xs font-semibold" style={{ color: `${color}bb` }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Login({ onSwitchToRegister }: Props) {
  const { signIn } = useAuth();
  const [step, setStep] = useState<'niche' | 'login'>('niche');
  const [niches, setNiches] = useState<NicheTemplate[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<NicheTemplate | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/niches/public`)
      .then(r => r.json())
      .then(d => setNiches(d.niches || []))
      .catch(() => setNiches([]));
  }, []);

  const handleSelectNiche = (n: NicheTemplate) => {
    setSelectedNiche(n);
    setStep('login');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
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

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #050d2e 0%, #0b1848 45%, #12054a 100%)' }}>
      <BackgroundGrid />

      {/* ── Right panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-14">
        <div className="w-full max-w-[460px]">

          {/* ── STEP 1: Niche selection ───────────────────────────────── */}
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
                <h2 className="text-xl font-bold text-white">Qual é o seu ramo de atividade?</h2>
                <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Selecione para entrarmos configurados para o seu negócio
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
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleSelectNiche(n)}
                        className="group flex items-center gap-3 rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.02]"
                        style={{
                          background: meta.bg,
                          border: `1.5px solid ${meta.color}30`,
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = `${meta.color}28`;
                          (e.currentTarget as HTMLElement).style.borderColor = `${meta.color}66`;
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = meta.bg;
                          (e.currentTarget as HTMLElement).style.borderColor = `${meta.color}30`;
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${meta.color}20` }}>
                          <Icon size={20} color={meta.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white leading-tight">{n.name}</p>
                          {n.description && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                              {n.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight size={14} className="shrink-0 opacity-40 group-hover:opacity-70 transition-opacity" color={meta.color} />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>OU</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              <button
                onClick={() => setStep('login')}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                Entrar sem selecionar ramo
              </button>

              <p className="text-center text-sm mt-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Ainda não tem conta?{' '}
                <button onClick={onSwitchToRegister} className="font-bold hover:underline" style={{ color: '#4f8ef7' }}>
                  Cadastre sua loja
                </button>
              </p>
            </div>
          )}

          {/* ── STEP 2: Login form ────────────────────────────────────── */}
          {step === 'login' && (
            <div className="rounded-3xl p-9 shadow-2xl" style={glassCard}>
              {/* Back button */}
              <button
                onClick={() => { setStep('niche'); setError(''); }}
                className="flex items-center gap-1.5 text-xs font-semibold mb-6 transition-opacity hover:opacity-70"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                <ArrowLeft size={13} /> Trocar ramo de atividade
              </button>

              {/* Logo + selected niche badge */}
              <div className="text-center mb-7">
                <div className="inline-flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c4dff)' }}>
                    <Store size={22} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-black text-xl leading-none tracking-[0.2em] uppercase">Multiloja</p>
                    <p className="text-xs font-bold tracking-[0.25em] uppercase mt-0.5" style={{ color: '#4f8ef7' }}>SaaS</p>
                  </div>
                </div>

                {selectedNiche ? (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3"
                    style={{ background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.3)' }}>
                    <CheckCircle2 size={13} color="#4f8ef7" />
                    <span className="text-sm font-semibold" style={{ color: '#4f8ef7' }}>
                      {selectedNiche.name}
                    </span>
                  </div>
                ) : null}

                <h2 className="text-2xl font-bold text-white">Acesso à Plataforma</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {selectedNiche
                    ? `Bem-vindo ao sistema para ${selectedNiche.name}`
                    : 'Entre para gerenciar todas as suas operações'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl px-4 py-3 text-sm text-red-300 text-center"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {error}
                  </div>
                )}

                <div className="relative">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="Email Corporativo"
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
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="Senha de Acesso"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white outline-none transition-all"
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = '#4f8ef7')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                <div className="text-right -mt-1">
                  <button type="button" className="text-xs font-medium hover:underline" style={{ color: '#4f8ef7' }}>
                    Esqueci minha senha?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-black text-sm text-white uppercase tracking-[0.15em] transition-opacity disabled:opacity-50 mt-1"
                  style={{ background: 'linear-gradient(135deg, #1a3fb5, #4f8ef7)' }}
                >
                  {loading ? 'Entrando...' : 'Entrar no Sistema'}
                </button>

                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>OU</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                </div>

                <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Ainda não tem conta?{' '}
                  <button type="button" onClick={onSwitchToRegister} className="font-bold hover:underline" style={{ color: '#4f8ef7' }}>
                    Cadastre sua loja agora
                  </button>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
