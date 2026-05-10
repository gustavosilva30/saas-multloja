import { useState, useEffect } from 'react';
import { 
  Wrench, Plus, Search, Filter, MoreHorizontal, 
  Clock, CheckCircle2, AlertCircle, XCircle, 
  Calendar, User, DollarSign, ExternalLink, Loader2,
  Trash2, Edit2, Check
} from "lucide-react";
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';

type OSStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'CANCELED';

interface ServiceOrder {
  id: string;
  os_number: number;
  status: OSStatus;
  total: string;
  expected_at: string | null;
  created_at: string;
  customer_name: string | null;
  assignee_name: string | null;
  asset_metadata: any;
}

interface Stats {
  total: number;
  draft: number;
  in_progress: number;
  waiting_parts: number;
  completed: number;
  canceled: number;
  revenue_completed: number;
}

const STATUS_CONFIG: Record<OSStatus, { label: string, color: string, icon: any }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-zinc-100 text-zinc-600 border-zinc-200', icon: Clock },
  PENDING_APPROVAL: { label: 'Aguard. Aprovação', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: AlertCircle },
  APPROVED: { label: 'Aprovado', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: CheckCircle2 },
  IN_PROGRESS: { label: 'Em Execução', color: 'bg-indigo-50 text-indigo-600 border-indigo-200', icon: Wrench },
  WAITING_PARTS: { label: 'Aguard. Peças', color: 'bg-orange-50 text-orange-600 border-orange-200', icon: Clock },
  COMPLETED: { label: 'Concluído', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: CheckCircle2 },
  CANCELED: { label: 'Cancelado', color: 'bg-red-50 text-red-600 border-red-200', icon: XCircle },
};

export function Services() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showNewModal, setShowNewModal] = useState(false);

  const token = localStorage.getItem('auth_token');

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (statusFilter) queryParams.append('status', statusFilter);

      const [osRes, statsRes] = await Promise.all([
        fetch(`${API}/api/service-orders?${queryParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/api/service-orders/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const osData = await osRes.json();
      const statsData = await statsRes.json();

      setOrders(osData.service_orders || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching OS:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const fmtCurrency = (val: string | number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));

  return (
    <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Ordens de Serviço</h1>
          <p className="text-sm text-zinc-500">Gerencie manutenções, reparos e assistências.</p>
        </div>
        <button 
          onClick={() => setShowNewModal(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 w-full md:w-auto justify-center"
        >
          <Plus size={18} />
          Nova Ordem de Serviço
        </button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 text-zinc-500 mb-3">
              <Wrench size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Em Aberto</span>
            </div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white">
              {stats.in_progress + stats.draft + stats.waiting_parts}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 text-amber-500 mb-3">
              <Clock size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Aguardando</span>
            </div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white">{stats.waiting_parts}</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 text-emerald-500 mb-3">
              <CheckCircle2 size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Concluídas</span>
            </div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white">{stats.completed}</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm bg-zinc-950 dark:bg-zinc-950 group">
            <div className="flex items-center gap-3 text-zinc-400 mb-3">
              <DollarSign size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Receita (Mês)</span>
            </div>
            <div className="text-2xl font-black text-white">{fmtCurrency(stats.revenue_completed)}</div>
          </div>
        </div>
      )}

      {/* Filters & Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por cliente ou Nº da OS..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
            />
          </form>
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none dark:text-white"
            >
              <option value="">Todos os Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
              <p className="text-sm text-zinc-500 font-medium">Carregando ordens de serviço...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mb-6 text-zinc-300">
                <Wrench size={40} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Nenhuma OS encontrada</h3>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                {search || statusFilter 
                  ? "Tente ajustar seus filtros para encontrar o que procura." 
                  : "Comece criando sua primeira ordem de serviço para gerenciar seus atendimentos."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/30">
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">OS / Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Data Entrega</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Atendente</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {orders.map(os => {
                  const StatusIcon = STATUS_CONFIG[os.status]?.icon || Clock;
                  return (
                    <tr key={os.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-zinc-900 dark:text-white">OS-{os.os_number.toString().padStart(4, '0')}</span>
                          <span className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                            <User size={10} /> {os.customer_name || 'Consumidor'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-tight ${STATUS_CONFIG[os.status]?.color}`}>
                          <StatusIcon size={12} />
                          {STATUS_CONFIG[os.status]?.label}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                          <Calendar size={13} />
                          {os.expected_at ? new Date(os.expected_at).toLocaleDateString() : 'Não def.'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                          {os.assignee_name || 'Não atribuído'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">
                          {fmtCurrency(os.total)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" title="Ver Detalhes">
                            <ExternalLink size={18} />
                          </button>
                          <button className="p-2 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all" title="Editar">
                            <Edit2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
