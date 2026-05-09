import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Store, BarChart3, Package, Users, Truck, Zap, ShoppingCart, Globe } from 'lucide-react';

interface Props {
  onSwitchToRegister: () => void;
}

export function Login({ onSwitchToRegister }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  };

  const gridItems = [
    { Icon: ShoppingCart, label: 'PDV', color: '#4f8ef7', x: 90, y: 70 },
    { Icon: Package, label: 'Estoque', color: '#7c4dff', x: 250, y: 70 },
    { Icon: BarChart3, label: 'Financeiro', color: '#00c896', x: 410, y: 70 },
    { Icon: Users, label: 'Clientes', color: '#ff6b35', x: 90, y: 210 },
    { Icon: Store, label: 'Multi-Loja', color: '#4f8ef7', x: 250, y: 210, large: true },
    { Icon: Globe, label: 'E-commerce', color: '#7c4dff', x: 410, y: 210 },
    { Icon: Truck, label: 'Entregas', color: '#00c896', x: 90, y: 350 },
    { Icon: Zap, label: 'Automação', color: '#ff6b35', x: 250, y: 350 },
    { Icon: BarChart3, label: 'Relatórios', color: '#4f8ef7', x: 410, y: 350 },
  ];

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'linear-gradient(135deg, #050d2e 0%, #0b1848 45%, #12054a 100%)' }}
    >
      {/* ── Esquerda: ilustração ─────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative px-10">
        <div className="relative z-10 text-center mb-10">
          <h1 className="text-4xl font-black text-white leading-tight uppercase tracking-wide">
            Gerencie Múltiplas Lojas<br />
            <span style={{ color: '#4f8ef7' }}>com Eficiência Centralizada</span>
          </h1>
        </div>

        {/* Grade com ícones */}
        <div className="relative w-full max-w-lg" style={{ height: 420 }}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 420" fill="none">
            {[90, 250, 410].map(x =>
              [70, 210, 350].map(y => (
                <circle key={`d-${x}-${y}`} cx={x} cy={y} r="3" fill="#4f8ef7" opacity="0.5" />
              ))
            )}
            {[90, 250, 410].map(x => (
              <line key={`v-${x}`} x1={x} y1={70} x2={x} y2={350} stroke="#4f8ef720" strokeWidth="1.5" strokeDasharray="4 4" />
            ))}
            {[70, 210, 350].map(y => (
              <line key={`h-${y}`} x1={90} y1={y} x2={410} y2={y} stroke="#4f8ef720" strokeWidth="1.5" strokeDasharray="4 4" />
            ))}
          </svg>

          {gridItems.map(({ Icon, label, color, x, y, large }) => (
            <div
              key={label}
              className="absolute flex flex-col items-center gap-1.5"
              style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
            >
              <div
                className="rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  width: large ? 66 : 50,
                  height: large ? 66 : 50,
                  background: `${color}1a`,
                  border: `1.5px solid ${color}44`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Icon size={large ? 30 : 22} color={color} />
              </div>
              <span className="text-xs font-semibold" style={{ color: `${color}bb` }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Direita: card de login ───────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-14">
        <div
          className="w-full max-w-[420px] rounded-3xl p-9 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.055)',
            backdropFilter: 'blur(28px)',
            border: '1.5px solid rgba(255,255,255,0.11)',
          }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c4dff)' }}
              >
                <Store size={22} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-black text-xl leading-none tracking-[0.2em] uppercase">Multiloja</p>
                <p className="text-xs font-bold tracking-[0.25em] uppercase mt-0.5" style={{ color: '#4f8ef7' }}>SaaS</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Acesso à Plataforma</h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Entre para gerenciar todas as suas operações
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm text-red-300 text-center"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {error}
              </div>
            )}

            <div className="relative">
              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.35)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Email Corporativo"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.1)' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#4f8ef7')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            <div className="relative">
              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.35)' }} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Senha de Acesso"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.1)' }}
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
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-bold hover:underline"
                style={{ color: '#4f8ef7' }}
              >
                Cadastre sua loja agora
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
