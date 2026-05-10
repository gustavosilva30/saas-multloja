import { useState, useEffect, useCallback, useRef, type FormEvent, type ChangeEvent } from 'react';
import {
  Search, Plus, X, User, Phone, Mail, MapPin, Star, Tag,
  ChevronDown, Trash2, Pencil, MoreHorizontal, RefreshCw,
  Car, HeartPulse, Building2, ShoppingBag, Filter,
  Instagram, Globe, MessageCircle, ChevronLeft, ChevronRight,
  TrendingUp, Users, CreditCard, UserCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTenant } from '../contexts/TenantContext';

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

interface Address {
  cep?: string; logradouro?: string; numero?: string;
  complemento?: string; bairro?: string; cidade?: string; estado?: string;
}

interface Customer {
  id: string;
  name: string;
  person_type: 'PF' | 'PJ';
  document?: string;
  rg?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  gender?: 'M' | 'F' | 'O';
  birthday?: string;
  address: Address;
  notes?: string;
  credit_limit: number;
  credit_balance: number;
  rating: number;
  tags: string[];
  metadata: Record<string, string>;
  is_active: boolean;
  created_at: string;
}

interface Stats {
  total: string;
  active: string;
  new_this_month: string;
  total_credit_balance: string;
  with_credit: string;
}

interface SaleHistory {
  id: string; created_at: string; total: number;
  discount: number; payment_method: string; status: string; item_count: number;
}

type Tab = 'geral' | 'endereco' | 'financeiro' | 'nicho' | 'historico';

// ── Niche fields config ───────────────────────────────────────────────────────

const NICHE_FIELDS: Record<string, { key: string; label: string; type: string; options?: string[]; placeholder?: string }[]> = {
  oficina: [
    { key: 'placa',       label: 'Placa',              type: 'text',   placeholder: 'ABC-1D23' },
    { key: 'veiculo',     label: 'Veículo / Modelo',   type: 'text',   placeholder: 'Honda Civic 2020' },
    { key: 'chassi',      label: 'Chassi',             type: 'text',   placeholder: 'XXXXXXXXXXXXXXXXX' },
    { key: 'cor',         label: 'Cor',                type: 'text',   placeholder: 'Preto' },
    { key: 'km',          label: 'Quilometragem (km)', type: 'number', placeholder: '50000' },
    { key: 'seguradora',  label: 'Seguradora',         type: 'text',   placeholder: 'Porto Seguro' },
    { key: 'apolice',     label: 'Nº Apólice',         type: 'text',   placeholder: '0000000' },
  ],
  clinica: [
    { key: 'convenio',       label: 'Convênio Médico',    type: 'text',   placeholder: 'Unimed / Bradesco' },
    { key: 'carteirinha',    label: 'Nº Carteirinha',     type: 'text',   placeholder: '0000000000' },
    { key: 'tipo_sanguineo', label: 'Tipo Sanguíneo',     type: 'select', options: ['A+','A-','B+','B-','AB+','AB-','O+','O-'] },
    { key: 'alergias',       label: 'Alergias',           type: 'text',   placeholder: 'Ex: Dipirona' },
    { key: 'medico_resp',    label: 'Médico Responsável', type: 'text',   placeholder: 'Dr. Silva' },
    { key: 'plano',          label: 'Plano',              type: 'text',   placeholder: 'Plano Ouro' },
    { key: 'historico_med',  label: 'Histórico Médico',   type: 'text',   placeholder: 'Diabetes, Hipertensão...' },
  ],
  restaurante: [
    { key: 'pref_alimentar', label: 'Preferências',        type: 'text', placeholder: 'Vegano, sem glúten...' },
    { key: 'alergias_alim',  label: 'Alergias Alimentares',type: 'text', placeholder: 'Amendoim, lactose...' },
    { key: 'mesa_favorita',  label: 'Mesa Favorita',       type: 'text', placeholder: 'Mesa 5' },
    { key: 'pedido_padrao',  label: 'Pedido Habitual',     type: 'text', placeholder: 'Frango com batata...' },
  ],
  varejo: [
    { key: 'tam_roupa',   label: 'Tamanho Roupa',    type: 'select', options: ['PP','P','M','G','GG','XGG'] },
    { key: 'tam_calcado', label: 'Nº Calçado',       type: 'text',   placeholder: '42' },
    { key: 'estilo',      label: 'Estilo Preferido', type: 'text',   placeholder: 'Casual, Esportivo...' },
    { key: 'canal_pref',  label: 'Canal Preferido',  type: 'select', options: ['Loja física','WhatsApp','E-commerce','Instagram'] },
  ],
};

const fmtBRL  = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('pt-BR') : '—';
const initials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const AVATAR_COLORS = ['bg-emerald-500','bg-blue-500','bg-violet-500','bg-amber-500','bg-rose-500','bg-teal-500'];
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const EMPTY_FORM = (): Partial<Customer> => ({
  person_type: 'PF', name: '', document: '', rg: '', email: '', phone: '',
  phone2: '', whatsapp: '', instagram: '', website: '', gender: undefined,
  birthday: '', address: {}, notes: '', credit_limit: 0, credit_balance: 0,
  rating: 0, tags: [], metadata: {}, is_active: true,
});

// ── Star Rating ───────────────────────────────────────────────────────────────

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" disabled={readonly}
          onClick={() => onChange?.(s === value ? 0 : s)}
          className={cn('transition-colors', readonly ? 'cursor-default' : 'hover:text-amber-400')}
        >
          <Star size={14} className={s <= value ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'} />
        </button>
      ))}
    </div>
  );
}

// ── Tag Input ─────────────────────────────────────────────────────────────────

function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim().toLowerCase();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput('');
  };
  return (
    <div className="flex flex-wrap gap-1.5 p-2 border border-zinc-200 rounded-lg min-h-[38px] bg-white">
      {value.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-medium">
          {tag}
          <button type="button" onClick={() => onChange(value.filter(t => t !== tag))}><X size={10} /></button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={value.length === 0 ? 'Digite e pressione Enter…' : ''}
        className="flex-1 min-w-[120px] text-xs outline-none bg-transparent text-zinc-700 placeholder:text-zinc-400"
      />
    </div>
  );
}

// ── Customer Drawer ───────────────────────────────────────────────────────────

function CustomerDrawer({
  customer, niche, onClose, onSave,
}: {
  customer: Customer | null; niche: string; onClose: () => void; onSave: () => void;
}) {
  const isNew = !customer;
  const [tab, setTab] = useState<Tab>('geral');
  const [form, setForm] = useState<Partial<Customer>>(() => customer ? { ...customer, address: customer.address || {}, tags: customer.tags || [], metadata: customer.metadata || {} } : EMPTY_FORM());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [sales, setSales] = useState<SaleHistory[]>([]);
  const [salesStats, setSalesStats] = useState<{ lifetime_value: string; total_orders: string } | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);

  useEffect(() => {
    if (!isNew && tab === 'historico') {
      setSalesLoading(true);
      apiFetch<{ sales: SaleHistory[]; lifetime_value: string; total_orders: string }>(`/api/customers/${customer!.id}/sales`)
        .then(d => { setSales(d.sales); setSalesStats({ lifetime_value: d.lifetime_value, total_orders: d.total_orders }); })
        .catch(() => {})
        .finally(() => setSalesLoading(false));
    }
  }, [tab, customer, isNew]);

  const set = (field: keyof Customer) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const setAddr = (field: keyof Address) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, address: { ...p.address, [field]: e.target.value } }));

  const setMeta = (key: string, val: string) =>
    setForm(p => ({ ...p, metadata: { ...p.metadata, [key]: val } }));

  const lookupCep = async () => {
    const cep = form.address?.cep?.replace(/\D/g, '');
    if (!cep || cep.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm(p => ({
          ...p, address: {
            ...p.address, logradouro: d.logradouro, bairro: d.bairro,
            cidade: d.localidade, estado: d.uf,
          },
        }));
      }
    } catch { /* ignore */ }
    setCepLoading(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) { setError('Nome é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      const body = { ...form, address: form.address || {}, tags: form.tags || [], metadata: form.metadata || {} };
      if (isNew) {
        await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(body) });
      } else {
        await apiFetch(`/api/customers/${customer!.id}`, { method: 'PUT', body: JSON.stringify(body) });
      }
      onSave(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
    setSaving(false);
  };

  const inputCls = 'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all';
  const labelCls = 'block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1';

  const nicheFields = NICHE_FIELDS[niche] || NICHE_FIELDS['varejo'];

  const TABS: { id: Tab; label: string }[] = [
    { id: 'geral',      label: 'Geral' },
    { id: 'endereco',   label: 'Endereço' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'nicho',      label: niche === 'oficina' ? 'Veículo' : niche === 'clinica' ? 'Saúde' : niche === 'restaurante' ? 'Preferências' : 'Perfil' },
    ...(!isNew ? [{ id: 'historico' as Tab, label: 'Histórico' }] : []),
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={onClose}>
      <div
        className="bg-white h-full w-full max-w-xl flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 shrink-0">
          <div className="flex items-center gap-3">
            {!isNew && (
              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0', avatarColor(customer!.name))}>
                {initials(customer!.name)}
              </div>
            )}
            <div>
              <h2 className="font-semibold text-zinc-800 text-sm">{isNew ? 'Novo Cliente' : customer!.name}</h2>
              {!isNew && <p className="text-xs text-zinc-400">desde {fmtDate(customer!.created_at)}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 px-5 shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={cn('py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors',
                tab === t.id ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-zinc-500 hover:text-zinc-800'
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

            {/* ── Aba Geral ── */}
            {tab === 'geral' && (
              <div className="space-y-4">
                {/* Tipo PF/PJ */}
                <div>
                  <label className={labelCls}>Tipo de Pessoa</label>
                  <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
                    {(['PF', 'PJ'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setForm(p => ({ ...p, person_type: t }))}
                        className={cn('flex-1 py-2 text-sm font-semibold transition-colors',
                          form.person_type === t ? 'bg-emerald-500 text-white' : 'text-zinc-600 hover:bg-zinc-50'
                        )}>
                        {t === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>Nome {form.person_type === 'PJ' ? 'da Empresa' : 'Completo'} *</label>
                    <input value={form.name || ''} onChange={set('name')} placeholder={form.person_type === 'PJ' ? 'Razão Social' : 'Nome completo'} className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>{form.person_type === 'PF' ? 'CPF' : 'CNPJ'}</label>
                    <input value={form.document || ''} onChange={set('document')} placeholder={form.person_type === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'} className={inputCls} />
                  </div>
                  {form.person_type === 'PF' && (
                    <div>
                      <label className={labelCls}>RG</label>
                      <input value={form.rg || ''} onChange={set('rg')} placeholder="00.000.000-0" className={inputCls} />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>E-mail</label>
                    <input type="email" value={form.email || ''} onChange={set('email')} placeholder="email@exemplo.com" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Telefone</label>
                    <input value={form.phone || ''} onChange={set('phone')} placeholder="(00) 00000-0000" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Celular / Tel. 2</label>
                    <input value={form.phone2 || ''} onChange={set('phone2')} placeholder="(00) 00000-0000" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>WhatsApp</label>
                    <input value={form.whatsapp || ''} onChange={set('whatsapp')} placeholder="(00) 00000-0000" className={inputCls} />
                  </div>
                  {form.person_type === 'PF' && (
                    <>
                      <div>
                        <label className={labelCls}>Data de Nascimento</label>
                        <input type="date" value={form.birthday ? form.birthday.split('T')[0] : ''} onChange={set('birthday')} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Gênero</label>
                        <div className="relative">
                          <select value={form.gender || ''} onChange={set('gender')} className={cn(inputCls, 'appearance-none pr-8')}>
                            <option value="">Não informado</option>
                            <option value="M">Masculino</option>
                            <option value="F">Feminino</option>
                            <option value="O">Outro</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <label className={labelCls}>Instagram</label>
                    <input value={form.instagram || ''} onChange={set('instagram')} placeholder="@usuario" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Website</label>
                    <input value={form.website || ''} onChange={set('website')} placeholder="https://..." className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Tags</label>
                  <TagInput value={form.tags || []} onChange={tags => setForm(p => ({ ...p, tags }))} />
                </div>

                <div>
                  <label className={labelCls}>Classificação</label>
                  <StarRating value={form.rating || 0} onChange={rating => setForm(p => ({ ...p, rating }))} />
                </div>

                <div>
                  <label className={labelCls}>Observações</label>
                  <textarea value={form.notes || ''} onChange={set('notes')} rows={3}
                    placeholder="Preferências, informações importantes…"
                    className={cn(inputCls, 'resize-none')} />
                </div>
              </div>
            )}

            {/* ── Aba Endereço ── */}
            {tab === 'endereco' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={labelCls}>CEP</label>
                    <input
                      value={form.address?.cep || ''} onChange={setAddr('cep')}
                      onBlur={lookupCep} placeholder="00000-000" className={inputCls}
                    />
                  </div>
                  <button type="button" onClick={lookupCep}
                    className="self-end px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 flex items-center gap-1">
                    {cepLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Buscar'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>Logradouro</label>
                    <input value={form.address?.logradouro || ''} onChange={setAddr('logradouro')} placeholder="Rua, Av, Travessa..." className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Número</label>
                    <input value={form.address?.numero || ''} onChange={setAddr('numero')} placeholder="123" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Complemento</label>
                  <input value={form.address?.complemento || ''} onChange={setAddr('complemento')} placeholder="Apto, Sala, Bloco..." className={inputCls} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Bairro</label>
                    <input value={form.address?.bairro || ''} onChange={setAddr('bairro')} placeholder="Centro" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Cidade</label>
                    <input value={form.address?.cidade || ''} onChange={setAddr('cidade')} placeholder="São Paulo" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Estado</label>
                    <input value={form.address?.estado || ''} onChange={setAddr('estado')} placeholder="SP" maxLength={2} className={inputCls} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Aba Financeiro ── */}
            {tab === 'financeiro' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Limite de Crédito (R$)</label>
                    <input type="number" min="0" step="0.01"
                      value={form.credit_limit ?? 0} onChange={set('credit_limit')}
                      className={inputCls} />
                    <p className="text-[10px] text-zinc-400 mt-1">Valor máximo de compras a prazo</p>
                  </div>
                  <div>
                    <label className={labelCls}>Saldo Haver (R$)</label>
                    <input type="number" min="0" step="0.01"
                      value={form.credit_balance ?? 0} onChange={set('credit_balance')}
                      className={inputCls} />
                    <p className="text-[10px] text-zinc-400 mt-1">Crédito disponível do cliente</p>
                  </div>
                </div>

                {!isNew && (
                  <div className="bg-zinc-50 rounded-xl border border-zinc-100 p-4 space-y-2">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Situação financeira</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-zinc-400 text-xs">Limite disponível</p>
                        <p className="font-bold text-emerald-600">{fmtBRL((form.credit_limit || 0) - (form.credit_balance || 0))}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 text-xs">Haver acumulado</p>
                        <p className="font-bold text-blue-600">{fmtBRL(form.credit_balance || 0)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelCls}>Status do cadastro</label>
                  <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
                    {[true, false].map(v => (
                      <button key={String(v)} type="button" onClick={() => setForm(p => ({ ...p, is_active: v }))}
                        className={cn('flex-1 py-2 text-sm font-semibold transition-colors',
                          form.is_active === v ? (v ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'text-zinc-500 hover:bg-zinc-50'
                        )}>
                        {v ? 'Ativo' : 'Inativo'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Aba Nicho ── */}
            {tab === 'nicho' && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400">Campos específicos para {niche === 'oficina' ? 'oficina mecânica' : niche === 'clinica' ? 'clínica / saúde' : niche === 'restaurante' ? 'restaurante' : 'varejo'}.</p>
                <div className="grid grid-cols-2 gap-3">
                  {nicheFields.map(f => (
                    <div key={f.key} className={f.type === 'text' && f.key.includes('hist') ? 'col-span-2' : ''}>
                      <label className={labelCls}>{f.label}</label>
                      {f.type === 'select' ? (
                        <div className="relative">
                          <select
                            value={form.metadata?.[f.key] || ''}
                            onChange={e => setMeta(f.key, e.target.value)}
                            className={cn(inputCls, 'appearance-none pr-8')}
                          >
                            <option value="">Selecionar…</option>
                            {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                      ) : (
                        <input
                          type={f.type}
                          value={form.metadata?.[f.key] || ''}
                          onChange={e => setMeta(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className={inputCls}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Aba Histórico ── */}
            {tab === 'historico' && (
              <div className="space-y-4">
                {salesStats && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                      <p className="text-xs text-emerald-600 font-medium">Valor total gasto</p>
                      <p className="text-lg font-bold text-emerald-700">{fmtBRL(parseFloat(salesStats.lifetime_value))}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <p className="text-xs text-blue-600 font-medium">Total de pedidos</p>
                      <p className="text-lg font-bold text-blue-700">{salesStats.total_orders}</p>
                    </div>
                  </div>
                )}
                {salesLoading ? (
                  <div className="flex justify-center py-8"><RefreshCw size={18} className="animate-spin text-zinc-400" /></div>
                ) : sales.length === 0 ? (
                  <div className="text-center py-10 text-zinc-400">
                    <ShoppingBag size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma compra registrada</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {sales.map(s => (
                      <li key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
                        <div>
                          <p className="text-sm font-medium text-zinc-800">{fmtBRL(s.total)}</p>
                          <p className="text-xs text-zinc-400">{fmtDate(s.created_at)} · {s.item_count} item(s) · {s.payment_method || '—'}</p>
                        </div>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                          s.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          s.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                        )}>
                          {s.status === 'completed' ? 'Concluída' : s.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {tab !== 'historico' && (
            <div className="px-5 py-3 border-t border-zinc-200 bg-white flex items-center justify-end gap-3 shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 shadow-sm">
                {saving ? 'Salvando…' : isNew ? 'Criar Cliente' : 'Salvar Alterações'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────

function DeleteModal({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h3 className="font-bold text-center mb-1">Inativar cliente</h3>
        <p className="text-sm text-zinc-500 text-center mb-6">
          Deseja inativar <strong className="text-zinc-700">{name}</strong>? O histórico será mantido.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Inativar</button>
        </div>
      </div>
    </div>
  );
}

// ── Kebab menu ────────────────────────────────────────────────────────────────

function KebabMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-36 bg-white border border-zinc-200 rounded-xl shadow-lg py-1">
          <button onClick={() => { setOpen(false); onEdit(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
            <Pencil size={13} /> Editar
          </button>
          <div className="my-1 border-t border-zinc-100" />
          <button onClick={() => { setOpen(false); onDelete(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 size={13} /> Inativar
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Customers page ───────────────────────────────────────────────────────

export function Customers() {
  const { niche } = useTenant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const nicheIcon = niche === 'oficina' ? Car : niche === 'clinica' ? HeartPulse : niche === 'restaurante' ? ShoppingBag : Building2;
  const NicheIcon = nicheIcon;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20', status: statusFilter });
      if (search) params.set('search', search);
      if (tagFilter) params.set('tag', tagFilter);
      const [data, s] = await Promise.all([
        apiFetch<{ customers: Customer[]; pagination: { total: number; totalPages: number } }>(`/api/customers?${params}`),
        apiFetch<Stats>('/api/customers/stats'),
      ]);
      setCustomers(data.customers);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
      setStats(s);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search, statusFilter, tagFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setPage(1), 350);
  };

  const handleDelete = async (c: Customer) => {
    try {
      await apiFetch(`/api/customers/${c.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      load();
    } catch { /* ignore */ }
  };

  const statCards = stats ? [
    { label: 'Total de clientes', value: stats.total, icon: Users, color: 'text-zinc-700', bg: 'bg-zinc-50' },
    { label: 'Ativos', value: stats.active, icon: UserCheck, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'Novos este mês', value: stats.new_this_month, icon: TrendingUp, color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'Com saldo haver', value: stats.with_credit, icon: CreditCard, color: 'text-violet-700', bg: 'bg-violet-50' },
  ] : [];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-800">Clientes</h1>
            <p className="text-xs text-zinc-400 mt-0.5">{total} cadastro(s)</p>
          </div>
          <div className="flex-1" />
          {/* Search */}
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar por nome, CPF, telefone…"
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>
          {/* Filter */}
          <div className="relative">
            <button onClick={() => setFilterOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50">
              <Filter size={14} /> Filtros
              {(statusFilter !== 'active' || tagFilter) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-zinc-200 rounded-xl shadow-lg p-3 z-20 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Status</label>
                  <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-md text-sm focus:outline-none focus:border-emerald-500">
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                    <option value="all">Todos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Tag</label>
                  <input value={tagFilter} onChange={e => { setTagFilter(e.target.value); setPage(1); }}
                    placeholder="Ex: vip, revendedor…"
                    className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-md text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <button onClick={() => { setStatusFilter('active'); setTagFilter(''); setPage(1); setFilterOpen(false); }}
                  className="w-full text-xs text-zinc-500 hover:text-zinc-800 py-1">Limpar filtros</button>
              </div>
            )}
          </div>
          <button
            onClick={() => setDrawerCustomer('new')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-sm shrink-0">
            <Plus size={16} /> Novo Cliente
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            {statCards.map(s => (
              <div key={s.label} className={cn('flex items-center gap-3 rounded-xl p-3', s.bg)}>
                <s.icon size={18} className={s.color} />
                <div>
                  <p className={cn('text-lg font-bold leading-none', s.color)}>{s.value}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
            <User size={36} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">Nenhum cliente encontrado</p>
            <p className="text-xs mt-1">Tente outros filtros ou cadastre um novo cliente</p>
          </div>
        ) : (
          <table className="w-full text-sm border-separate border-spacing-0 mt-2">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 border-b border-zinc-100">Cliente</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 border-b border-zinc-100">Documento</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 border-b border-zinc-100">Contato</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 border-b border-zinc-100 hidden lg:table-cell">Tags</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 border-b border-zinc-100 hidden xl:table-cell"><NicheIcon size={12} className="inline mr-1" />Nicho</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 border-b border-zinc-100">Avaliação</th>
                <th className="w-16 px-3 py-3 border-b border-zinc-100" />
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const nicheKey = niche === 'oficina' ? 'placa' : niche === 'clinica' ? 'convenio' : niche === 'restaurante' ? 'pref_alimentar' : 'tam_roupa';
                const nicheVal = c.metadata?.[nicheKey];
                return (
                  <tr key={c.id}
                    onClick={() => setDrawerCustomer(c)}
                    className="group hover:bg-zinc-50 cursor-pointer transition-colors">
                    <td className="px-3 py-3 border-b border-zinc-100">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', avatarColor(c.name))}>
                          {initials(c.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-800 truncate">{c.name}</p>
                          <p className="text-xs text-zinc-400">{c.person_type} · {c.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-b border-zinc-100 text-zinc-600 text-xs">{c.document || '—'}</td>
                    <td className="px-3 py-3 border-b border-zinc-100">
                      <div className="space-y-0.5">
                        {c.phone && <p className="text-xs text-zinc-600 flex items-center gap-1"><Phone size={10} /> {c.phone}</p>}
                        {c.whatsapp && <p className="text-xs text-emerald-600 flex items-center gap-1"><MessageCircle size={10} /> {c.whatsapp}</p>}
                        {c.instagram && <p className="text-xs text-violet-600 flex items-center gap-1"><Instagram size={10} /> {c.instagram}</p>}
                      </div>
                    </td>
                    <td className="px-3 py-3 border-b border-zinc-100 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {(c.tags || []).slice(0, 3).map(t => (
                          <span key={t} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[10px] font-medium">{t}</span>
                        ))}
                        {(c.tags || []).length > 3 && <span className="text-[10px] text-zinc-400">+{c.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 border-b border-zinc-100 hidden xl:table-cell">
                      <span className="text-xs text-zinc-500">{nicheVal || '—'}</span>
                    </td>
                    <td className="px-3 py-3 border-b border-zinc-100">
                      <StarRating value={c.rating || 0} readonly />
                    </td>
                    <td className="px-3 py-3 border-b border-zinc-100" onClick={e => e.stopPropagation()}>
                      <KebabMenu
                        onEdit={() => setDrawerCustomer(c)}
                        onDelete={() => setDeleteTarget(c)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-100 bg-white">
          <span className="text-sm text-zinc-500">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50">
              <ChevronLeft size={16} />
            </button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Drawer */}
      {drawerCustomer !== null && (
        <CustomerDrawer
          customer={drawerCustomer === 'new' ? null : drawerCustomer}
          niche={niche || 'varejo'}
          onClose={() => setDrawerCustomer(null)}
          onSave={load}
        />
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </div>
  );
}
