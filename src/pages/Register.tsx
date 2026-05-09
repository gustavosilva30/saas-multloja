import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const NICHES = [
  { value: 'varejo', label: 'Varejo' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'clinica', label: 'Clínica' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'outros', label: 'Outros' },
];

interface Props {
  onSwitchToLogin: () => void;
}

export function Register({ onSwitchToLogin }: Props) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    tenant_name: '',
    email: '',
    password: '',
    niche: 'varejo',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signUp(form.email, form.password, {
      full_name: form.full_name,
      tenant_name: form.tenant_name,
      niche: form.niche,
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500 mb-4">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <h1 className="text-2xl font-bold text-white">NexusERP</h1>
          <p className="text-gray-400 text-sm mt-1">Crie sua conta grátis</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-800">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Seu nome</label>
            <input
              type="text"
              value={form.full_name}
              onChange={set('full_name')}
              required
              minLength={2}
              placeholder="João Silva"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome da empresa</label>
            <input
              type="text"
              value={form.tenant_name}
              onChange={set('tenant_name')}
              required
              minLength={2}
              placeholder="Minha Loja"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Segmento</label>
            <select
              value={form.niche}
              onChange={set('niche')}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {NICHES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              placeholder="seu@email.com"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-4">
          Já tem conta?{' '}
          <button onClick={onSwitchToLogin} className="text-emerald-400 hover:text-emerald-300 font-medium">
            Entrar
          </button>
        </p>
      </div>
    </div>
  );
}
