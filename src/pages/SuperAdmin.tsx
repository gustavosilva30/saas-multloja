import { useState, useEffect, FormEvent, MouseEvent } from 'react';
import { Building2, Users, Package, TrendingUp, LogOut, ChevronRight, ToggleLeft, ToggleRight, X, Tag, Save, Loader2, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '../lib/utils';

const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';

const NICHES: Record<string, string> = {
  varejo: 'Varejo', oficina: 'Oficina', clinica: 'Clínica',
  restaurante: 'Restaurante', outros: 'Outros',
};

const MODULES: Record<string, string> = {
  dashboard: 'Dashboard', pos: 'PDV', stock: 'Estoque', catalog: 'Catálogo',
  services: 'Serviços/OS', events: 'Eventos', customers: 'Clientes',
  finance: 'Financeiro', automations: 'Automações', ai_assistant: 'Assistente IA',
  ecommerce: 'E-commerce', marketing: 'Marketing', delivery: 'Entregas',
  image_editor: 'Editor Imagem', messages: 'Recados', calendar: 'Calendário',
  freight_quote: 'Frete', credit_check: 'SCPC', plate_check: 'Placa',
  bin_check: 'BIN', modules: 'App Store', settings: 'Ajustes',
};

async function adminFetch<T>(path: string, token: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}/api/admin${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

// ── Types ───────────────────────────────────────────────────────────────────

interface Stats { total_tenants: number; total_users: number; new_tenants_30d: number; active_users_7d: number; }
interface TenantRow { id: string; name: string; niche: string; subscription_tier: string; is_active: boolean; created_at: string; user_count: number; active_module_count: number; last_activity: string | null; }
interface TenantDetail { tenant: TenantRow; users: { id: string; email: string; full_name: string; role: string; is_active: boolean; last_login_at: string | null }[]; modules: { module_id: string; is_active: boolean; activated_at: string }[]; }

// ── Login ────────────────────────────────────────────────────────────────────

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(r => r.json());
      if (data.token) { localStorage.setItem('admin_token', data.token); onLogin(data.token); }
      else setError(data.error || 'Credenciais inválidas');
    } catch { setError('Erro de conexão'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-600 mb-4">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Painel da Plataforma NexusERP</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@gsntech.com.br"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors">
            {loading ? 'Entrando...' : 'Entrar como Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Tenant Detail Modal ──────────────────────────────────────────────────────

function TenantModal({ detail, onClose }: { detail: TenantDetail; onClose: () => void }) {
  const { tenant, users, modules } = detail;
  const activeModules = modules.filter(m => m.is_active).map(m => m.module_id);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{tenant.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{NICHES[tenant.niche] || tenant.niche} · {tenant.subscription_tier}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Módulos ativos */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Módulos Ativos ({activeModules.length})</h3>
            {activeModules.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum módulo ativado ainda</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeModules.map(m => (
                  <span key={m} className="bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs px-3 py-1 rounded-full border border-violet-500/30">
                    {MODULES[m] || m}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Usuários */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Usuários ({users.length})</h3>
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{u.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.role === 'owner' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                      u.role === 'admin' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                      'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                    }`}>{u.role}</span>
                    <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Module Pricing Tab ────────────────────────────────────────────────────────

interface CatalogMod { module_id: string; name: string; description: string; category: string; price: string; is_free: boolean; is_active: boolean; }

function ModulePricing({ token }: { token: string }) {
  const [modules, setModules] = useState<CatalogMod[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { price: string; is_free: boolean; is_active: boolean }>>({});

  useEffect(() => {
    adminFetch<{ modules: CatalogMod[] }>('/modules', token)
      .then(d => setModules(d.modules))
      .catch(() => {});
  }, [token]);

  const edit = (id: string, field: string, value: unknown) => {
    setEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const get = (mod: CatalogMod, field: 'price' | 'is_free' | 'is_active') => {
    const e = edits[mod.module_id];
    if (e && field in e) return e[field as keyof typeof e];
    return mod[field];
  };

  const save = async (mod: CatalogMod) => {
    const e = edits[mod.module_id];
    if (!e) return;
    setSaving(mod.module_id);
    try {
      await adminFetch(`/modules/${mod.module_id}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          price: e.price !== undefined ? Number(e.price) : undefined,
          is_free: e.is_free,
          is_active: e.is_active,
        }),
      });
      setModules(prev => prev.map(m => m.module_id === mod.module_id ? { ...m, ...e, price: e.price } : m));
      setEdits(prev => { const n = { ...prev }; delete n[mod.module_id]; return n; });
    } catch { alert('Erro ao salvar'); }
    setSaving(null);
  };

  const byCategory = modules.reduce<Record<string, CatalogMod[]>>((acc, m) => {
    (acc[m.category] = acc[m.category] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {(Object.entries(byCategory) as [string, CatalogMod[]][]).map(([cat, mods]) => (
        <div key={cat} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cat}</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {mods.map(mod => {
              const isDirty = !!edits[mod.module_id];
              return (
                <div key={mod.module_id} className="flex items-center gap-4 px-6 py-3 flex-wrap">
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{mod.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{mod.module_id}</p>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={get(mod, 'is_free') as boolean}
                      onChange={e => edit(mod.module_id, 'is_free', e.target.checked)}
                      className="accent-emerald-500"
                    />
                    Gratuito
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={get(mod, 'is_active') as boolean}
                      onChange={e => edit(mod.module_id, 'is_active', e.target.checked)}
                      className="accent-violet-500"
                    />
                    Visível
                  </label>

                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={get(mod, 'is_free') as boolean}
                      value={get(mod, 'price') as string}
                      onChange={e => edit(mod.module_id, 'price', e.target.value)}
                      className="w-20 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-500 disabled:opacity-40"
                    />
                  </div>

                  <button
                    onClick={() => save(mod)}
                    disabled={!isDirty || saving === mod.module_id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-30 text-white transition-colors"
                  >
                    {saving === mod.module_id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Salvar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tab, setTab] = useState<'tenants' | 'modules'>('tenants');
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [selected, setSelected] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('admin_theme') as 'light' | 'dark' | 'system') || 'dark';
  });

  // Apply theme effect
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    localStorage.setItem('admin_theme', theme);
  }, [theme]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        adminFetch<Stats>('/stats', token),
        adminFetch<{ tenants: TenantRow[] }>('/tenants', token),
      ]);
      setStats(s);
      setTenants(t.tenants);
    } catch { onLogout(); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openTenant = async (id: string) => {
    const detail = await adminFetch<TenantDetail>(`/tenants/${id}`, token);
    setSelected(detail);
  };

  const toggleTenant = async (id: string, e: MouseEvent) => {
    e.stopPropagation();
    await adminFetch(`/tenants/${id}/toggle`, token, { method: 'POST' });
    load();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center font-bold text-sm">S</div>
          <div>
            <p className="font-bold text-sm text-gray-900 dark:text-white">NexusERP</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Super Admin</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-950 p-1 rounded-lg border border-gray-200 dark:border-gray-800">
            <button 
              onClick={() => setTheme('light')}
              className={cn("p-1.5 rounded-md text-gray-500 transition-all", theme === 'light' ? 'bg-white shadow-sm text-yellow-500' : 'hover:text-gray-900')}
              title="Tema claro"
            >
              <Sun size={14} />
            </button>
            <button 
              onClick={() => setTheme('system')}
              className={cn("p-1.5 rounded-md text-gray-500 transition-all", theme === 'system' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'hover:text-gray-900 dark:hover:text-gray-300')}
              title="Tema do sistema"
            >
              <Monitor size={14} />
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={cn("p-1.5 rounded-md text-gray-500 transition-all", theme === 'dark' ? 'bg-gray-800 shadow-sm text-indigo-400' : 'hover:text-gray-300')}
              title="Tema escuro"
            >
              <Moon size={14} />
            </button>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-300 dark:border-gray-800 pb-0">
          <button
            onClick={() => setTab('tenants')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === 'tenants' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-b-0 border-gray-300 dark:border-gray-800' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <Building2 size={15} /> Empresas
          </button>
          <button
            onClick={() => setTab('modules')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === 'modules' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-b-0 border-gray-300 dark:border-gray-800' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <Tag size={15} /> Preços dos Módulos
          </button>
        </div>

        {tab === 'modules' && <ModulePricing token={token} />}

        {tab === 'tenants' && <>
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Empresas ativas', value: stats.total_tenants, icon: Building2, color: 'violet' },
              { label: 'Usuários ativos', value: stats.total_users, icon: Users, color: 'blue' },
              { label: 'Novas (30 dias)', value: stats.new_tenants_30d, icon: TrendingUp, color: 'emerald' },
              { label: 'Usuários ativos (7d)', value: stats.active_users_7d, icon: Package, color: 'amber' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <div className={`w-9 h-9 rounded-lg bg-${color}-100 dark:bg-${color}-500/20 flex items-center justify-center mb-3`}>
                  <Icon size={18} className={`text-${color}-600 dark:text-${color}-400`} />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tenant list */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Empresas cadastradas</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{tenants.length} total</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {tenants.map(t => (
                <div key={t.id} onClick={() => openTenant(t.id)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center font-bold text-violet-600 dark:text-violet-300 shrink-0">
                    {t.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate text-gray-900 dark:text-white">{t.name}</p>
                      {!t.is_active && <span className="text-xs bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">Desativada</span>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{NICHES[t.niche] || t.niche} · {t.user_count} usuário{t.user_count !== 1 ? 's' : ''} · {t.active_module_count} módulo{t.active_module_count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      t.subscription_tier === 'premium' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                    }`}>{t.subscription_tier}</span>
                    <button
                      onClick={e => toggleTenant(t.id, e)}
                      className={`transition-colors ${t.is_active ? 'text-emerald-600 dark:text-emerald-400 hover:text-red-500 dark:hover:text-red-400' : 'text-red-500 dark:text-red-400 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                      title={t.is_active ? 'Desativar empresa' : 'Ativar empresa'}
                    >
                      {t.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                    <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
              ))}
              {tenants.length === 0 && (
                <p className="text-center text-gray-500 py-12">Nenhuma empresa cadastrada ainda</p>
              )}
            </div>
          )}
        </div>
        </>}
      </main>

      {selected && <TenantModal detail={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function SuperAdmin() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  if (!token) return <AdminLogin onLogin={setToken} />;
  return <AdminDashboard token={token} onLogout={handleLogout} />;
}
