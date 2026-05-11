import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, CheckCircle2, Circle, Target, Calendar, ArrowRight,
  Wallet, TrendingUp, Star, ChevronRight, ChevronLeft, X, Trophy, Heart,
  Baby, Crown, UserRound, Sparkles, ShoppingCart, Home, Car,
  Stethoscope, GraduationCap, PartyPopper, LayoutGrid, Pencil, Trash2,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function useApi<T>(path: string, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try { setData(await apiFetch<T>(path)); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => { load(); }, deps);
  return { data, loading, reload: load };
}

const api = (method: string, path: string, body?: any) =>
  apiFetch(path, { method, body });

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ emoji, color, size = 'md', points }: {
  emoji: string; color: string; size?: 'sm' | 'md' | 'lg'; points?: number;
}) {
  const s = { sm: 'w-8 h-8 text-base', md: 'w-11 h-11 text-xl', lg: 'w-16 h-16 text-3xl' }[size];
  return (
    <div className="relative flex-shrink-0">
      <div className={`${s} rounded-2xl flex items-center justify-center shadow-sm`} style={{ background: color + '22', border: `2px solid ${color}44` }}>
        <span>{emoji}</span>
      </div>
      {points !== undefined && (
        <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white text-[9px] font-black rounded-full px-1 leading-4 shadow-sm">
          {points}
        </div>
      )}
    </div>
  );
}

// ── Role badge ────────────────────────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; icon: any; color: string }> = {
  ADMIN: { label: 'Admin', icon: Crown, color: '#f59e0b' },
  ADULT: { label: 'Adulto', icon: UserRound, color: '#6366f1' },
  CHILD: { label: 'Criança', icon: Baby, color: '#ec4899' },
};

function RoleBadge({ role }: { role: string }) {
  const m = ROLE_META[role] || ROLE_META.ADULT;
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: m.color + '18', color: m.color }}>
      <Icon size={9} /> {m.label}
    </span>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function Progress({ value, max, color = '#10b981' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{fmt(value)}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-right text-xs text-slate-400">Meta: {fmt(max)}</div>
    </div>
  );
}

// ── Category icons ────────────────────────────────────────────────────────────
const CAT_ICONS: Record<string, any> = {
  FOOD: ShoppingCart, HOUSING: Home, TRANSPORT: Car,
  HEALTH: Stethoscope, EDUCATION: GraduationCap, LEISURE: PartyPopper, GENERAL: Wallet,
};
const CAT_COLORS: Record<string, string> = {
  FOOD: '#f97316', HOUSING: '#8b5cf6', TRANSPORT: '#3b82f6',
  HEALTH: '#ef4444', EDUCATION: '#eab308', LEISURE: '#ec4899', GENERAL: '#6b7280',
};

// ── Event type ────────────────────────────────────────────────────────────────
const EVT_META: Record<string, { emoji: string; color: string }> = {
  SCHOOL: { emoji: '🏫', color: '#3b82f6' },
  MEDICAL: { emoji: '🏥', color: '#ef4444' },
  COUPLE: { emoji: '💑', color: '#ec4899' },
  BIRTHDAY: { emoji: '🎂', color: '#f59e0b' },
  GENERAL: { emoji: '📅', color: '#6b7280' },
};

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h3 className="text-slate-800 font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inp = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10 placeholder:text-slate-400';
const Label = ({ c }: { c: string }) => <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{c}</label>;

// ── New Group Modal ───────────────────────────────────────────────────────────
function NewGroupModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api('POST', '/api/family/groups', { name }); onSaved(); }
    finally { setSaving(false); }
  }
  return (
    <Modal title="Novo Grupo Familiar" onClose={onClose}>
      <form onSubmit={save} className="px-5 pb-5 space-y-4">
        <div><Label c="Nome do grupo" />
          <input required value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="Ex: Família Silva" />
        </div>
        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm disabled:opacity-50 transition-colors">
          {saving ? 'Criando…' : 'Criar Grupo'}
        </button>
      </form>
    </Modal>
  );
}

// ── Edit Group Modal ──────────────────────────────────────────────────────────
function EditGroupModal({ group, onClose, onSaved }: { group: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(group.name);
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api('PUT', `/api/family/groups/${group.id}`, { name }); onSaved(); }
    finally { setSaving(false); }
  }
  return (
    <Modal title="Editar Grupo" onClose={onClose}>
      <form onSubmit={save} className="px-5 pb-5 space-y-4">
        <div><Label c="Nome do grupo" />
          <input required value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="Ex: Família Silva" />
        </div>
        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm disabled:opacity-50 transition-colors">
          {saving ? 'Salvando…' : 'Salvar Alterações'}
        </button>
      </form>
    </Modal>
  );
}

// ── New Member Modal ──────────────────────────────────────────────────────────
const EMOJIS = ['😊','👨','👩','👦','👧','🧑','👴','👵','🐶','🐱','🦁','🐻'];
const COLORS = ['#10b981','#6366f1','#ec4899','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#06b6d4'];

function NewMemberModal({ groupId, onClose, onSaved }: { groupId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', role: 'ADULT', avatar_emoji: '😊', avatar_color: '#10b981', income_share: '50', monthly_income: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { 
      await api('POST', `/api/family/groups/${groupId}/members`, { 
        ...form, 
        income_share: parseFloat(form.income_share),
        monthly_income: parseFloat(form.monthly_income || '0')
      }); 
      onSaved(); 
    }
    finally { setSaving(false); }
  }
  return (
    <Modal title="Adicionar Membro" onClose={onClose}>
      <form onSubmit={save} className="px-5 pb-5 space-y-4">
        {/* Emoji picker */}
        <div>
          <Label c="Avatar" />
          <div className="flex flex-wrap gap-2 mb-2">
            {EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => set('avatar_emoji', e)}
                className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${form.avatar_emoji === e ? 'ring-2 ring-violet-500 bg-violet-50 scale-110' : 'hover:bg-slate-100'}`}>
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => set('avatar_color', c)}
                className={`w-6 h-6 rounded-full transition-all ${form.avatar_color === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-125' : ''}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>

        <div><Label c="Nome *" />
          <input required value={form.name} onChange={e => set('name', e.target.value)} className={inp} placeholder="Nome do membro" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label c="Perfil" />
            <select value={form.role} onChange={e => set('role', e.target.value)}
              className={inp + ' cursor-pointer'}>
              <option value="ADMIN">Admin</option>
              <option value="ADULT">Adulto</option>
              <option value="CHILD">Criança</option>
            </select>
          </div>
          <div><Label c="Renda Mensal (R$)" />
            <input type="number" step="0.01" value={form.monthly_income} onChange={e => set('monthly_income', e.target.value)}
              className={inp} placeholder="0,00" />
          </div>
        </div>

        <div><Label c="% da renda (para divisão proporcional)" />
          <input type="number" min="0" max="100" value={form.income_share} onChange={e => set('income_share', e.target.value)} className={inp} />
        </div>

        <div><Label c="WhatsApp (opcional)" />
          <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inp} placeholder="(11) 99999-9999" />
        </div>

        {/* Preview */}
        <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3">
          <Avatar emoji={form.avatar_emoji} color={form.avatar_color} size="md" />
          <div>
            <p className="font-bold text-slate-800 text-sm">{form.name || 'Nome do membro'}</p>
            <RoleBadge role={form.role} />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm disabled:opacity-50">
          {saving ? 'Salvando…' : 'Adicionar Membro'}
        </button>
      </form>
    </Modal>
  );
}

// ── New Expense Modal ─────────────────────────────────────────────────────────
function NewExpenseModal({ groupId, members, onClose, onSaved }: {
  groupId: string; members: any[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    paid_by_member_id: members[0]?.id || '',
    amount: '', description: '', category: 'GENERAL', split_type: 'EQUAL',
    expense_date: new Date().toISOString().slice(0, 10),
    is_recurrent: false, recurrence_period: 'MONTHLY',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!form.paid_by_member_id && members.length > 0) {
      set('paid_by_member_id', members[0].id);
    }
  }, [members, form.paid_by_member_id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.paid_by_member_id) {
      alert('Selecione quem pagou a despesa');
      return;
    }
    setSaving(true);
    try {
      await api('POST', `/api/family/groups/${groupId}/expenses`, form);
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar despesa');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nova Despesa" onClose={onClose}>
      <form onSubmit={save} className="px-5 pb-5 space-y-4">
        <div><Label c="Descrição *" />
          <input required value={form.description} onChange={e => set('description', e.target.value)} className={inp} placeholder="Ex: Supermercado, Aluguel…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label c="Valor (R$) *" />
            <input required type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} className={inp} placeholder="0,00" />
          </div>
          <div><Label c="Data" />
            <input type="date" value={form.expense_date} onChange={e => set('expense_date', e.target.value)} className={inp} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label c="Pago por" />
            <select value={form.paid_by_member_id} onChange={e => set('paid_by_member_id', e.target.value)} className={inp + ' cursor-pointer'}>
              {members.map(m => <option key={m.id} value={m.id}>{m.avatar_emoji} {m.name}</option>)}
            </select>
          </div>
          <div><Label c="Divisão" />
            <select value={form.split_type} onChange={e => set('split_type', e.target.value)} className={inp + ' cursor-pointer'}>
              <option value="EQUAL">Igual</option>
              <option value="PROPORTIONAL">Proporcional à renda</option>
            </select>
          </div>
        </div>
        <div>
          <Label c="Categoria" />
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(CAT_ICONS).map(([cat, Icon]) => (
              <button key={cat} type="button" onClick={() => set('category', cat)}
                className={`flex flex-col items-center py-2 rounded-xl text-xs font-semibold transition-all ${
                  form.category === cat ? 'ring-2 scale-105' : 'hover:bg-slate-50'
                }`}
                style={{ color: form.category === cat ? CAT_COLORS[cat] : '#94a3b8', background: form.category === cat ? CAT_COLORS[cat] + '18' : undefined }}>
                <Icon size={16} className="mb-1" />
                {cat === 'HOUSING' ? 'Casa' : cat === 'TRANSPORT' ? 'Trans.' : cat === 'EDUCATION' ? 'Educ.' : cat === 'LEISURE' ? 'Lazer' : cat === 'HEALTH' ? 'Saúde' : cat === 'FOOD' ? 'Comida' : 'Geral'}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-slate-50 rounded-2xl px-4 py-3 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => set('is_recurrent', !form.is_recurrent)}
              className={`w-10 h-5 rounded-full relative transition-colors ${form.is_recurrent ? 'bg-violet-500' : 'bg-slate-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-all ${form.is_recurrent ? 'left-5' : 'left-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-slate-700">Despesa recorrente</span>
          </label>
          {form.is_recurrent && (
            <div><Label c="Frequência" />
              <select value={form.recurrence_period} onChange={e => set('recurrence_period', e.target.value)} className={inp + ' cursor-pointer'}>
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quinzenal</option>
                <option value="MONTHLY">Mensal</option>
                <option value="YEARLY">Anual</option>
              </select>
            </div>
          )}
        </div>
        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm disabled:opacity-50">
          {saving ? 'Salvando…' : 'Registrar Despesa'}
        </button>
      </form>
    </Modal>
  );
}

// ── New Task Modal ────────────────────────────────────────────────────────────
function NewTaskModal({ groupId, members, onClose, onSaved }: {
  groupId: string; members: any[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: '', description: '', assigned_to_member_id: '',
    points_reward: '10', due_date: '', recurrent: false, recurrent_days: '7',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await api('POST', `/api/family/groups/${groupId}/tasks`, {
        ...form,
        points_reward: parseInt(form.points_reward),
        recurrent_days: form.recurrent ? parseInt(form.recurrent_days) : undefined,
        assigned_to_member_id: form.assigned_to_member_id || undefined,
        due_date: form.due_date || undefined,
      });
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <Modal title="Nova Tarefa" onClose={onClose}>
      <form onSubmit={save} className="px-5 pb-5 space-y-4">
        <div><Label c="Tarefa *" />
          <input required value={form.title} onChange={e => set('title', e.target.value)} className={inp} placeholder="Ex: Lavar a louça, Estudar…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label c="Atribuir a" />
            <select value={form.assigned_to_member_id} onChange={e => set('assigned_to_member_id', e.target.value)} className={inp + ' cursor-pointer'}>
              <option value="">Qualquer um</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.avatar_emoji} {m.name}</option>)}
            </select>
          </div>
          <div><Label c="Pontos 🏆" />
            <input type="number" min="1" max="500" value={form.points_reward} onChange={e => set('points_reward', e.target.value)} className={inp} />
          </div>
        </div>
        <div><Label c="Prazo (opcional)" />
          <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={inp} />
        </div>
        <div className="bg-slate-50 rounded-2xl px-4 py-3 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => set('recurrent', !form.recurrent)}
              className={`w-10 h-5 rounded-full relative transition-colors ${form.recurrent ? 'bg-violet-500' : 'bg-slate-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-all ${form.recurrent ? 'left-5' : 'left-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-slate-700">Repetir automaticamente</span>
          </label>
          {form.recurrent && (
            <div><Label c="Repetir a cada (dias)" />
              <input type="number" min="1" value={form.recurrent_days} onChange={e => set('recurrent_days', e.target.value)} className={inp} />
            </div>
          )}
        </div>
        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm disabled:opacity-50">
          {saving ? 'Salvando…' : 'Criar Tarefa'}
        </button>
      </form>
    </Modal>
  );
}

// ── New Event Modal ───────────────────────────────────────────────────────────
function NewEventModal({ groupId, members, onClose, onSaved }: {
  groupId: string; members: any[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ title: '', event_date: '', type: 'GENERAL', location: '', member_id: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await api('POST', `/api/family/groups/${groupId}/events`, { ...form, member_id: form.member_id || undefined });
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <Modal title="Novo Evento" onClose={onClose}>
      <form onSubmit={save} className="px-5 pb-5 space-y-4">
        <div><Label c="Título *" />
          <input required value={form.title} onChange={e => set('title', e.target.value)} className={inp} placeholder="Ex: Consulta médica, Formatura…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label c="Data e hora *" />
            <input required type="datetime-local" value={form.event_date} onChange={e => set('event_date', e.target.value)} className={inp} />
          </div>
          <div><Label c="Tipo" />
            <select value={form.type} onChange={e => set('type', e.target.value)} className={inp + ' cursor-pointer'}>
              {Object.entries(EVT_META).map(([k, v]) => <option key={k} value={k}>{v.emoji} {k === 'SCHOOL' ? 'Escola' : k === 'MEDICAL' ? 'Médico' : k === 'COUPLE' ? 'Casal' : k === 'BIRTHDAY' ? 'Aniversário' : 'Geral'}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label c="Membro" />
            <select value={form.member_id} onChange={e => set('member_id', e.target.value)} className={inp + ' cursor-pointer'}>
              <option value="">Todos</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.avatar_emoji} {m.name}</option>)}
            </select>
          </div>
          <div><Label c="Local" />
            <input value={form.location} onChange={e => set('location', e.target.value)} className={inp} placeholder="Endereço…" />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm disabled:opacity-50">
          {saving ? 'Salvando…' : 'Salvar Evento'}
        </button>
      </form>
    </Modal>
  );
}

// ── New Goal Modal ────────────────────────────────────────────────────────────
function NewGoalModal({ groupId, onClose, onSaved }: { groupId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', target_amount: '', target_date: '', emoji: '🎯', color: '#10b981' });
  const [saving, setSaving] = useState(false);
  const GOAL_EMOJIS = ['🎯','🏖️','🚗','🏠','💻','✈️','📱','🎓','💍','🎮'];
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api('POST', `/api/family/groups/${groupId}/goals`, { ...form, target_amount: parseFloat(form.target_amount) }); onSaved(); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Nova Meta" onClose={onClose}>
      <form onSubmit={save} className="px-5 pb-5 space-y-4">
        <div>
          <Label c="Emoji da meta" />
          <div className="flex gap-2 flex-wrap">
            {GOAL_EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => set('emoji', e)}
                className={`w-9 h-9 text-xl rounded-xl flex items-center justify-center transition-all ${form.emoji === e ? 'bg-violet-100 ring-2 ring-violet-400 scale-110' : 'hover:bg-slate-100'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div><Label c="Nome da meta *" />
          <input required value={form.title} onChange={e => set('title', e.target.value)} className={inp} placeholder="Ex: Viagem para Europa, Carro novo…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label c="Valor alvo (R$) *" />
            <input required type="number" step="0.01" value={form.target_amount} onChange={e => set('target_amount', e.target.value)} className={inp} placeholder="0,00" />
          </div>
          <div><Label c="Prazo (opcional)" />
            <input type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)} className={inp} />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-50">
          {saving ? 'Salvando…' : 'Criar Meta'}
        </button>
      </form>
    </Modal>
  );
}

// ── Edit Member Modal ─────────────────────────────────────────────────────────
function EditMemberModal({ groupId, member, onClose, onSaved }: { groupId: string; member: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ 
    name: member.name, 
    role: member.role, 
    avatar_emoji: member.avatar_emoji, 
    avatar_color: member.avatar_color, 
    income_share: String(member.income_share), 
    monthly_income: String(member.monthly_income || ''), 
    phone: member.phone || '' 
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { 
      await api('PUT', `/api/family/groups/${groupId}/members/${member.id}`, { 
        ...form, 
        income_share: parseFloat(form.income_share),
        monthly_income: parseFloat(form.monthly_income || '0')
      }); 
      onSaved(); 
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm('Deseja realmente remover este membro?')) return;
    await api('DELETE', `/api/family/groups/${groupId}/members/${member.id}`);
    onSaved();
  }

  return (
    <Modal title="Editar Membro" onClose={onClose}>
      <form onSubmit={save} className="px-5 pb-5 space-y-4">
        {/* Avatar */}
        <div>
          <Label c="Avatar" />
          <div className="flex flex-wrap gap-2 mb-2">
            {EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => set('avatar_emoji', e)}
                className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${form.avatar_emoji === e ? 'ring-2 ring-violet-500 bg-violet-50 scale-110' : 'hover:bg-slate-100'}`}>
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => set('avatar_color', c)}
                className={`w-6 h-6 rounded-full transition-all ${form.avatar_color === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-125' : ''}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>

        <div><Label c="Nome *" />
          <input required value={form.name} onChange={e => set('name', e.target.value)} className={inp} placeholder="Nome do membro" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label c="Perfil" />
            <select value={form.role} onChange={e => set('role', e.target.value)}
              className={inp + ' cursor-pointer'}>
              <option value="ADMIN">Admin</option>
              <option value="ADULT">Adulto</option>
              <option value="CHILD">Criança</option>
            </select>
          </div>
          <div><Label c="Renda Mensal (R$)" />
            <input type="number" step="0.01" value={form.monthly_income} onChange={e => set('monthly_income', e.target.value)}
              className={inp} placeholder="0,00" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={remove}
            className="py-3 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 font-bold text-sm transition-colors flex items-center justify-center gap-2">
            <Trash2 size={16} /> Remover
          </button>
          <button type="submit" disabled={saving}
            className="py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm disabled:opacity-50 transition-colors">
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function FamilyDashboard({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [tab, setTab] = useState<'home' | 'wallet' | 'tasks' | 'calendar'>('home');
  const [modal, setModal] = useState<'member' | 'expense' | 'task' | 'event' | 'goal' | { type: 'edit_member'; data: any } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data: dash, reload } = useApi<any>(`/api/family/groups/${groupId}/dashboard`, [groupId]);
  const { data: expData, reload: reloadExp } = useApi<any>(`/api/family/groups/${groupId}/expenses?month=${selectedMonth}`, [tab === 'wallet', groupId, selectedMonth]);
  const { data: tasksData, reload: reloadTasks } = useApi<any>(`/api/family/groups/${groupId}/tasks`, [tab === 'tasks', groupId]);
  const { data: eventsData, reload: reloadEvents } = useApi<any>(`/api/family/groups/${groupId}/events`, [tab === 'calendar', groupId]);

  const members = dash?.members || [];
  const goals   = dash?.goals   || [];
  const expenses = expData?.expenses || [];
  const tasks   = tasksData?.tasks   || [];
  const events  = eventsData?.events || [];
  const settlement = dash?.settlement;

  async function completeTask(taskId: string, memberId: string) {
    await api('PATCH', `/api/family/groups/${groupId}/tasks/${taskId}/complete`, { member_id: memberId });
    reload(); reloadTasks();
  }

  const TABS = [
    { id: 'home',     label: 'Início',    icon: LayoutGrid },
    { id: 'wallet',   label: 'Carteira',  icon: Wallet },
    { id: 'tasks',    label: 'Tarefas',   icon: CheckCircle2 },
    { id: 'calendar', label: 'Agenda',    icon: Calendar },
  ] as const;

  return (
    <div className="flex flex-col min-h-full bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Heart size={18} className="text-rose-400" /> {groupName}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{members.length} membros</p>
          </div>
          <button onClick={() => setModal('member')}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors">
            <Plus size={14} /> Membro
          </button>
        </div>

        {/* Membros row */}
        {members.length > 0 && (
          <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
            {members.map((m: any) => (
              <div key={m.id} onClick={() => setModal({ type: 'edit_member', data: m } as any)}
                className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform">
                <Avatar emoji={m.avatar_emoji} color={m.avatar_color} size="md" points={m.points} />
                <span className="text-[10px] text-slate-600 font-medium">{m.name.split(' ')[0]}</span>
                <RoleBadge role={m.role} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-slate-100 flex">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors ${
                tab === t.id ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-400 hover:text-slate-600'
              }`}>
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 p-4 space-y-4 pb-6">

        {/* HOME */}
        {tab === 'home' && (
          <>
            {/* Metas */}
            {goals.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Target size={14} className="text-emerald-500" /> Metas</h3>
                  <button onClick={() => setModal('goal')} className="text-xs text-violet-600 font-semibold flex items-center gap-1"><Plus size={12} /> Nova</button>
                </div>
                {goals.map((g: any) => (
                  <div key={g.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{g.emoji}</span>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{g.title}</p>
                        {g.target_date && <p className="text-xs text-slate-400">Até {new Date(g.target_date).toLocaleDateString('pt-BR')}</p>}
                      </div>
                    </div>
                    <Progress value={Number(g.current_amount)} max={Number(g.target_amount)} color={g.color} />
                  </div>
                ))}
              </div>
            )}

            {/* Tarefas pendentes */}
            {(dash?.pending_tasks || []).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><CheckCircle2 size={14} className="text-violet-500" /> Tarefas da semana</h3>
                {(dash?.pending_tasks || []).map((t: any) => (
                  <div key={t.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 flex items-center gap-3">
                    <Circle size={18} className="text-slate-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{t.title}</p>
                      {t.assigned_name && <p className="text-xs text-slate-400">{t.avatar_emoji} {t.assigned_name}</p>}
                    </div>
                    <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">+{t.points_reward}pts</span>
                  </div>
                ))}
              </div>
            )}

            {/* Próximos eventos */}
            {(dash?.upcoming_events || []).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Calendar size={14} className="text-blue-500" /> Próximos eventos</h3>
                {(dash?.upcoming_events || []).map((e: any) => {
                  const meta = EVT_META[e.type] || EVT_META.GENERAL;
                  return (
                    <div key={e.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: meta.color + '18' }}>{meta.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{e.title}</p>
                        <p className="text-xs text-slate-400">{new Date(e.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      {e.member_emoji && <span className="text-lg">{e.member_emoji}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {goals.length === 0 && (dash?.pending_tasks || []).length === 0 && (
              <div className="text-center py-12">
                <Sparkles size={40} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">Tudo em dia! 🎉</p>
                <p className="text-slate-300 text-xs mt-1">Adicione metas, tarefas e eventos para a família.</p>
              </div>
            )}

            <button onClick={() => setModal('goal')}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-200 text-emerald-600 text-sm font-semibold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
              <Target size={15} /> Nova Meta de Economia
            </button>
          </>
        )}

        {/* WALLET */}
        {tab === 'wallet' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const d = new Date(selectedMonth + '-01T12:00:00');
                    d.setMonth(d.getMonth() - 1);
                    setSelectedMonth(d.toISOString().slice(0, 7));
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-violet-600 hover:border-violet-200 transition-all active:scale-90">
                  <ChevronLeft size={20} />
                </button>
                <div className="bg-white px-5 py-2 rounded-xl shadow-sm border border-slate-200 font-bold text-slate-700 text-sm capitalize min-w-[140px] text-center">
                  {new Date(selectedMonth + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </div>
                <button
                  onClick={() => {
                    const d = new Date(selectedMonth + '-01T12:00:00');
                    d.setMonth(d.getMonth() + 1);
                    setSelectedMonth(d.toISOString().slice(0, 7));
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-violet-600 hover:border-violet-200 transition-all active:scale-90">
                  <ChevronRight size={20} />
                </button>
              </div>
              <button onClick={() => setModal('expense')}
                className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors">
                <Plus size={14} /> Registrar Despesa
              </button>
            </div>

            {/* ── CARD DE SALDO MENSAL (NOVO) ── */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 overflow-hidden relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo da Família</p>
                  <h3 className="text-2xl font-black text-slate-900">{fmt(settlement?.balance_remaining || 0)}</h3>
                </div>
                <div className={`p-3 rounded-2xl ${ (settlement?.balance_remaining || 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600' }`}>
                  <TrendingUp size={24} className={(settlement?.balance_remaining || 0) < 0 ? 'rotate-180' : ''} />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Orçamento Utilizado</span>
                    <span className="font-bold text-slate-700">
                      {Math.round(((settlement?.total_expenses || 0) / (settlement?.total_income || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        ((settlement?.total_expenses || 0) / (settlement?.total_income || 1)) > 0.9 ? 'bg-rose-500' : 
                        ((settlement?.total_expenses || 0) / (settlement?.total_income || 1)) > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, ((settlement?.total_expenses || 0) / (settlement?.total_income || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total Renda</p>
                    <p className="text-sm font-black text-slate-700">{fmt(settlement?.total_income || 0)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total Gastos</p>
                    <p className="text-sm font-black text-slate-700">{fmt(settlement?.total_expenses || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Dica de Saúde Financeira */}
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-start gap-3">
                <div className="text-xl">💡</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {(settlement?.balance_remaining || 0) > 0 
                    ? `Parabéns! Vocês economizaram ${fmt(settlement?.balance_remaining || 0)} este mês. Que tal investir em uma meta?`
                    : "Atenção! Os gastos superaram a renda. Revisem as despesas de lazer para o próximo mês."
                  }
                </p>
              </div>
            </div>

            {/* Acerto do mês */}
            {settlement && settlement.settlements.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Acerto do Mês</h4>
                {settlement.settlements.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                    <span className="text-xs font-semibold text-slate-600 flex-1">{s.from_name}</span>
                    <ArrowRight size={12} className="text-slate-300" />
                    <span className="text-xs font-semibold text-slate-600 flex-1">{s.to_name}</span>
                    <span className="font-black text-sm text-emerald-600">{fmt(s.amount)}</span>
                  </div>
                ))}
                <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                  <span>Total gasto em {settlement.period}</span>
                  <span className="font-bold text-slate-600">{fmt(settlement.total_expenses)}</span>
                </div>
              </div>
            )}

            {/* Lista de despesas */}
            <div className="space-y-2">
              {expenses.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200">
                  <div className="text-3xl mb-2">💸</div>
                  <p className="text-sm font-bold text-slate-400">Nenhuma despesa para este mês.</p>
                </div>
              ) : expenses.map((e: any) => {
                const Icon = CAT_ICONS[e.category] || Wallet;
                const color = CAT_COLORS[e.category] || '#6b7280';
                return (
                  <div key={e.id} className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: color + '12', border: `1px solid ${color}22` }}>
                      <Icon size={22} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{e.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          {e.avatar_emoji} {e.paid_by_name || 'Membro'}
                        </span>
                        <span className="text-[11px] text-slate-300">•</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(e.expense_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        {e.is_recurrent && (
                          <span className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Recorrente</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900 text-base">{fmt(Number(e.amount))}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{e.split_type === 'EQUAL' ? 'Divisão Igual' : 'Divisão Proporcional'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TASKS */}
        {tab === 'tasks' && (
          <>
            <button onClick={() => setModal('task')}
              className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm">
              <Plus size={15} /> Nova Tarefa
            </button>

            {/* Ranking */}
            {members.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
                <h4 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Trophy size={12} /> Ranking de Pontos
                </h4>
                {[...members].sort((a: any, b: any) => b.points - a.points).map((m: any, i: number) => (
                  <div key={m.id} className="flex items-center gap-2.5 py-1.5">
                    <span className="text-sm font-black text-amber-500 w-5 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                    <Avatar emoji={m.avatar_emoji} color={m.avatar_color} size="sm" />
                    <span className="flex-1 text-sm font-semibold text-slate-700">{m.name}</span>
                    <span className="text-sm font-black text-amber-600">{m.points} pts</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Nenhuma tarefa pendente.</div>
              ) : tasks.map((t: any) => (
                <div key={t.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 flex items-start gap-3">
                  <button
                    onClick={() => {
                      const memberId = members[0]?.id;
                      if (memberId) completeTask(t.id, memberId);
                    }}
                    className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-slate-200 hover:border-violet-500 hover:bg-violet-50 transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.assigned_name && <p className="text-xs text-slate-400">{t.avatar_emoji} {t.assigned_name}</p>}
                      {t.due_date && <p className="text-xs text-slate-300">· {new Date(t.due_date).toLocaleDateString('pt-BR')}</p>}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">+{t.points_reward}pts</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CALENDAR */}
        {tab === 'calendar' && (
          <>
            <button onClick={() => setModal('event')}
              className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm">
              <Plus size={15} /> Novo Evento
            </button>
            <div className="space-y-2">
              {events.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Nenhum evento próximo.</div>
              ) : events.map((e: any) => {
                const meta = EVT_META[e.type] || EVT_META.GENERAL;
                const dt = new Date(e.event_date);
                return (
                  <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex gap-3">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl flex-shrink-0"
                      style={{ background: meta.color + '18' }}>
                      <span className="text-xl">{meta.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{e.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                        {!e.all_day && ` às ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                      {e.location && <p className="text-xs text-slate-400 mt-0.5">📍 {e.location}</p>}
                      {e.member_name && <p className="text-xs text-slate-400">{e.member_emoji} {e.member_name}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {modal === 'member'  && <NewMemberModal  groupId={groupId} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
      {modal === 'expense' && <NewExpenseModal groupId={groupId} members={members} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); reloadExp(); }} />}
      {modal === 'task'    && <NewTaskModal    groupId={groupId} members={members} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); reloadTasks(); }} />}
      {modal === 'event'   && <NewEventModal   groupId={groupId} members={members} onClose={() => setModal(null)} onSaved={() => { setModal(null); reloadEvents(); }} />}
      {modal === 'goal'    && <NewGoalModal    groupId={groupId} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
      {typeof modal === 'object' && modal?.type === 'edit_member' && (
        <EditMemberModal 
          groupId={groupId} 
          member={modal.data} 
          onClose={() => setModal(null)} 
          onSaved={() => { setModal(null); reload(); }} 
        />
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function FamilyHub() {
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);
  const { data, reload } = useApi<any>('/api/family/groups');
  const groups = data?.groups || [];

  async function handleDeleteGroup(id: string, name: string) {
    if (!confirm(`Deseja excluir o grupo "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api('DELETE', `/api/family/groups/${id}`);
      reload();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir grupo');
    }
  }

  // Auto-select se só houver um grupo
  useEffect(() => {
    if (groups.length === 1 && !selectedGroup) setSelectedGroup({ id: groups[0].id, name: groups[0].name });
  }, [groups]);

  if (selectedGroup) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 px-1 py-2">
          <button onClick={() => setSelectedGroup(null)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            ← Grupos
          </button>
        </div>
        <FamilyDashboard groupId={selectedGroup.id} groupName={selectedGroup.name} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Heart size={22} className="text-rose-400" /> Gestão Familiar
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Hub de organização para casais e famílias</p>
        </div>
        <button onClick={() => setShowNewGroup(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors">
          <Plus size={15} /> Novo Grupo
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Bem-vindo ao Hub Familiar</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">Crie um grupo para organizar finanças, tarefas e agenda com sua família.</p>
          <button onClick={() => setShowNewGroup(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-colors">
            Criar Meu Grupo Familiar
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((g: any) => (
            <div key={g.id} className="relative group/card">
              <button onClick={() => setSelectedGroup({ id: g.id, name: g.name })}
                className="w-full bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-left hover:shadow-md hover:border-violet-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-xl">👨‍👩‍👧</div>
                    <div>
                      <p className="font-bold text-slate-800">{g.name}</p>
                      <p className="text-xs text-slate-400">{g.member_count || 0} membros</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover/card:text-violet-500 transition-colors" />
                </div>
                <div className="flex gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Users size={11} /> Família</span>
                  <span className="flex items-center gap-1"><Star size={11} /> Gamificado</span>
                  <span className="flex items-center gap-1"><Wallet size={11} /> Finanças</span>
                </div>
              </button>

              {/* Botões de Ação */}
              <div className="absolute top-4 right-10 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingGroup(g); }}
                  className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                  title="Editar Grupo"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id, g.name); }}
                  className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Excluir Grupo"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewGroup && (
        <NewGroupModal onClose={() => setShowNewGroup(false)} onSaved={() => { setShowNewGroup(false); reload(); }} />
      )}
      {editingGroup && (
        <EditGroupModal group={editingGroup} onClose={() => setEditingGroup(null)} onSaved={() => { setEditingGroup(null); reload(); }} />
      )}
    </div>
  );
}
