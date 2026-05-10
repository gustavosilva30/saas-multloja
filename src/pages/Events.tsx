import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket, Plus, Users, Calendar, MapPin, CheckCircle2,
  QrCode, Loader2, X, AlertCircle, ChevronRight, Clock,
  BarChart3, Send, Search, UserPlus, RefreshCw,
} from 'lucide-react';
import { EventWizard } from '../components/EventWizard';

const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';

interface TicketType { id: string; name: string; price: string; capacity: number; color: string }
interface Event {
  id: string; name: string; date: string; end_date: string | null;
  location: string | null; status: string;
  total_guests: number; checked_in: number; ticket_type_count: number;
}
interface Guest {
  id: string; name: string; email: string | null; phone: string | null;
  check_in_status: boolean; check_in_time: string | null;
  ticket_type_name: string | null; ticket_type_color: string | null;
  ticket_sent_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  PUBLISHED: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  ONGOING:   'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  FINISHED:  'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  CANCELED:  'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', PUBLISHED: 'Publicado', ONGOING: 'Em Andamento',
  FINISHED: 'Encerrado', CANCELED: 'Cancelado',
};

const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const fmtCurrency = (v: string | number) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


// ── Modal: Detalhe do Evento + Convidados ─────────────────────────────────────
function EventDetailModal({ event, token, onClose }: {
  event: Event; token: string; onClose: () => void;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'guests' | 'types'>('guests');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [types, setTypes] = useState<TicketType[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', email: '', ticket_type_id: '', send_ticket: true });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [resending, setResending] = useState<string | null>(null);

  const fetchGuests = async (q = '') => {
    setLoading(true);
    const [gRes, sRes, tRes] = await Promise.all([
      fetch(`${API}/api/events/${event.id}/guests?limit=100${q ? `&search=${encodeURIComponent(q)}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/api/events/${event.id}/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/api/events/${event.id}`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const [gd, sd, td] = await Promise.all([gRes.json(), sRes.json(), tRes.json()]);
    setGuests(gd.guests || []);
    setStats(sd);
    setTypes(td.ticket_types || []);
    setLoading(false);
  };

  useEffect(() => { fetchGuests(); }, []);

  const addGuest = async () => {
    if (!addForm.name) { setAddError('Nome é obrigatório'); return; }
    setAddSaving(true); setAddError('');
    try {
      const r = await fetch(`${API}/api/events/${event.id}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...addForm, ticket_type_id: addForm.ticket_type_id || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { setAddError(d.error || 'Erro'); setAddSaving(false); return; }
      setAddOpen(false);
      setAddForm({ name: '', phone: '', email: '', ticket_type_id: '', send_ticket: true });
      fetchGuests();
    } catch { setAddError('Falha de conexão'); }
    setAddSaving(false);
  };

  const resend = async (guestId: string) => {
    setResending(guestId);
    await fetch(`${API}/api/events/${event.id}/guests/${guestId}/resend`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setResending(null);
  };

  const filtered = guests.filter(g =>
    !search || g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone?.includes(search) || g.email?.toLowerCase().includes(search.toLowerCase())
  );

  const pct = stats ? Math.round((stats.checked_in / Math.max(stats.total_guests, 1)) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 md:p-6" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl max-h-[95vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{event.name}</h2>
            <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
              <Calendar size={11} /> {fmtDate(event.date)}
              {event.location && <><MapPin size={11} className="ml-2" /> {event.location}</>}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-black text-zinc-900 dark:text-white">{stats.checked_in}</p>
                <p className="text-xs text-zinc-500">Check-in</p>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-500">{pct}% comparecimento</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">{stats.total_guests} inscritos</span>
                </div>
                <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <button
                onClick={() => navigate(`/eventos/${event.id}/scanner`)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20"
              >
                <QrCode size={16} /> Portaria
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          {(['guests', 'types'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {t === 'guests' ? `Convidados (${guests.length})` : 'Lotes / Tipos'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'guests' && (
            <>
              {/* Toolbar */}
              <div className="flex gap-3 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar convidado..."
                    className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none dark:text-white"
                  />
                </div>
                <button onClick={() => fetchGuests()} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
                  <RefreshCw size={16} />
                </button>
                <button onClick={() => setAddOpen(true)}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors">
                  <UserPlus size={15} /> Adicionar
                </button>
              </div>

              {/* Add guest inline form */}
              {addOpen && (
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {[
                      { key: 'name', placeholder: 'Nome *', type: 'text' },
                      { key: 'phone', placeholder: 'WhatsApp (11) 9...', type: 'tel' },
                      { key: 'email', placeholder: 'Email', type: 'email' },
                    ].map(({ key, placeholder, type }) => (
                      <input key={key} type={type} placeholder={placeholder}
                        value={(addForm as any)[key]}
                        onChange={e => setAddForm(prev => ({ ...prev, [key]: e.target.value }))}
                        className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none dark:text-white"
                      />
                    ))}
                    <select value={addForm.ticket_type_id}
                      onChange={e => setAddForm(prev => ({ ...prev, ticket_type_id: e.target.value }))}
                      className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none dark:text-white"
                    >
                      <option value="">Sem lote</option>
                      {types.map(t => <option key={t.id} value={t.id}>{t.name} — {fmtCurrency(t.price)}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
                      <input type="checkbox" checked={addForm.send_ticket}
                        onChange={e => setAddForm(prev => ({ ...prev, send_ticket: e.target.checked }))}
                        className="accent-emerald-500"
                      />
                      Enviar ingresso por WhatsApp
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setAddOpen(false)} className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-white px-3 py-1.5">Cancelar</button>
                      <button onClick={addGuest} disabled={addSaving}
                        className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50">
                        {addSaving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        Confirmar Inscrição
                      </button>
                    </div>
                  </div>
                  {addError && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><AlertCircle size={12} />{addError}</p>}
                </div>
              )}

              {/* Guest list */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-emerald-500" size={28} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                  <Users size={40} className="mb-3 opacity-40" />
                  <p className="text-sm">{search ? 'Nenhum resultado' : 'Nenhum convidado ainda'}</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filtered.map(g => (
                    <div key={g.id} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                      {/* Status check-in */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        g.check_in_status
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                      }`}>
                        {g.check_in_status ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{g.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {g.ticket_type_name && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${g.ticket_type_color}20`, color: g.ticket_type_color ?? '#10b981' }}>
                              {g.ticket_type_name}
                            </span>
                          )}
                          {g.phone && <span className="text-xs text-zinc-400">{g.phone}</span>}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {g.check_in_status && g.check_in_time ? (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            {new Date(g.check_in_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        ) : g.phone ? (
                          <button onClick={() => resend(g.id)} disabled={resending === g.id}
                            className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
                            {resending === g.id ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                            {g.ticket_sent_at ? 'Reenviar' : 'Enviar WA'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'types' && (
            <div className="p-5 space-y-3">
              {types.length === 0 ? (
                <p className="text-center text-zinc-400 py-8 text-sm">Nenhum lote cadastrado</p>
              ) : (
                types.map(t => (
                  <div key={t.id} className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <div className="w-3 h-10 rounded-full shrink-0" style={{ background: t.color }} />
                    <div className="flex-1">
                      <p className="font-bold text-zinc-900 dark:text-white">{t.name}</p>
                      <p className="text-sm text-zinc-500">Capacidade: {t.capacity} · {fmtCurrency(t.price)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Event | null>(null);

  const token = localStorage.getItem('auth_token') ?? '';

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/events`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setEvents(d.events || []);
    } catch { /* silencioso */ }
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const totalCheckedIn = events.reduce((s, e) => s + e.checked_in, 0);
  const totalGuests    = events.reduce((s, e) => s + e.total_guests, 0);
  const activeEvents   = events.filter(e => ['PUBLISHED', 'ONGOING'].includes(e.status)).length;

  return (
    <div className="h-full flex flex-col space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Eventos & Ingressos</h2>
          <p className="text-sm text-zinc-500">Gerencie inscrições e realize check-in via QR Code.</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 w-full sm:w-auto justify-center">
          <Plus size={18} /> Criar Evento
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Ticket,       label: 'Eventos Ativos',  value: activeEvents,    color: 'text-blue-500' },
          { icon: Users,        label: 'Inscritos',        value: totalGuests,     color: 'text-zinc-500' },
          { icon: CheckCircle2, label: 'Check-ins',        value: totalCheckedIn,  color: 'text-emerald-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className={`flex items-center gap-2 mb-2 ${color}`}>
              <Icon size={18} />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</span>
            </div>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Event list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
            <Ticket size={40} className="text-zinc-300 mb-4" />
            <p className="font-bold text-zinc-900 dark:text-white mb-1">Nenhum evento ainda</p>
            <p className="text-sm text-zinc-500 mb-6">Crie seu primeiro evento para começar a gerenciar inscrições.</p>
            <button onClick={() => setShowNew(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
              <Plus size={16} /> Criar Evento
            </button>
          </div>
        ) : (
          events.map(ev => {
            const pct = ev.total_guests > 0 ? Math.round((ev.checked_in / ev.total_guests) * 100) : 0;
            return (
              <div key={ev.id}
                onClick={() => setSelected(ev)}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-zinc-900 dark:text-white truncate">{ev.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[ev.status] ?? ''}`}>
                        {STATUS_LABELS[ev.status] ?? ev.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><Calendar size={11} />{fmtDate(ev.date)}</span>
                      {ev.location && <span className="flex items-center gap-1 truncate"><MapPin size={11} />{ev.location}</span>}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-zinc-300 group-hover:text-emerald-500 transition-colors shrink-0 mt-1" />
                </div>

                {ev.total_guests > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-500">{ev.checked_in}/{ev.total_guests} check-ins</span>
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showNew && (
        <EventWizard 
          onClose={() => setShowNew(false)}
          onSuccess={async (data) => {
            // Transform data for API
            const payload = {
              name: data.name,
              category: data.category,
              description: data.description,
              date: data.start_date,
              end_date: data.end_date,
              location: data.type === 'online' ? data.online_link : data.location_name,
              status: 'PUBLISHED',
              ticket_types: data.tickets.map(t => ({
                name: t.name,
                price: t.price,
                capacity: t.capacity
              }))
            };

            const r = await fetch(`${API}/api/events`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(payload),
            });
            
            if (r.ok) {
              fetchEvents();
              setShowNew(false);
            } else {
              const d = await r.json();
              alert(d.error || 'Erro ao criar evento');
            }
          }}
        />
      )}

      {selected && (
        <EventDetailModal event={selected} token={token} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
