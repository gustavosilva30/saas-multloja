import { useState, useEffect } from 'react';
import { 
  FileText, Search, Printer, Receipt, CheckCircle2, 
  XCircle, Clock, ArrowRightLeft, User, ExternalLink,
  Loader2, Filter, Trash2, Calendar
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { QuotePrint } from '../components/QuotePrint';

type QuoteStatus = 'pending' | 'approved' | 'expired' | 'converted' | 'cancelled';

interface Quote {
  id: string;
  quote_number: number;
  display_name: string;
  total: string;
  subtotal: string;
  discount: string;
  shipping: string;
  status: QuoteStatus;
  created_at: string;
  validity_days: number;
  user_name: string;
}

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; icon: any }> = {
  pending:   { label: 'Pendente',   color: 'bg-amber-50 text-amber-600 border-amber-200', icon: Clock },
  approved:  { label: 'Aprovado',   color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: CheckCircle2 },
  expired:   { label: 'Expirado',   color: 'bg-zinc-50 text-zinc-500 border-zinc-200', icon: Clock },
  converted: { label: 'Convertido', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: ArrowRightLeft },
  cancelled: { label: 'Cancelado',  color: 'bg-red-50 text-red-600 border-red-200', icon: XCircle },
};

export function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [printing, setPrinting] = useState<{ type: 'A4' | 'Thermal'; quote: any; items: any[]; tenant: any } | null>(null);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ quotes: Quote[] }>('/api/quotes');
      setQuotes(data.quotes || []);
    } catch (err) {
      console.error('Error fetching quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handlePrint = async (quoteId: string, type: 'A4' | 'Thermal') => {
    try {
      const { quote, items } = await apiFetch<{ quote: any; items: any[] }>(`/api/quotes/${quoteId}`);
      const { tenant } = await apiFetch<{ tenant: any }>('/api/tenants/me');

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(`
        <html>
          <head>
            <title>Orçamento #${quote.quote_number}</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body onload="window.print(); window.close();">
            <div id="print-root"></div>
          </body>
        </html>
      `);

      // Transform for print template
      const displayQuote = {
        ...quote,
        display_name: quote.display_name || quote.customer_name || quote.guest_name
      };

      setPrinting({ type, quote: displayQuote, items, tenant });
      setTimeout(() => {
        const content = document.getElementById('quote-print-temp')?.innerHTML;
        printWindow.document.getElementById('print-root')!.innerHTML = content || '';
        printWindow.document.close();
        setPrinting(null);
      }, 100);

    } catch (err) {
      console.error('Print error:', err);
    }
  };

  const handleConvert = async (quoteId: string) => {
    if (!confirm('Deseja converter este orçamento em uma venda? Isso irá baixar o estoque.')) return;
    try {
      await apiFetch(`/api/quotes/${quoteId}/convert`, { method: 'POST' });
      fetchQuotes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredQuotes = quotes.filter(q => {
    const matchSearch = q.display_name?.toLowerCase().includes(search.toLowerCase()) || 
                       String(q.quote_number).includes(search);
    const matchStatus = statusFilter ? q.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const fmtBRL = (v: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));

  return (
    <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Orçamentos</h1>
          <p className="text-sm text-zinc-500">Gerencie propostas e negociações comerciais.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por cliente ou número..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
          />
        </div>
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

      {/* List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
              <p className="text-sm text-zinc-500">Carregando orçamentos...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mb-6 text-zinc-300">
                <FileText size={40} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Nenhum orçamento encontrado</h3>
              <p className="text-sm text-zinc-500 max-w-xs">Tente ajustar seus filtros ou crie um novo orçamento no PDV.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/30">
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Nº / Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Vendedor</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Total</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredQuotes.map(quote => {
                  const cfg = STATUS_CONFIG[quote.status];
                  const Icon = cfg.icon;
                  return (
                    <tr key={quote.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-zinc-900 dark:text-white block">
                          #{String(quote.quote_number).padStart(5, '0')}
                        </span>
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5 uppercase font-bold">
                          <Calendar size={10} /> {new Date(quote.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <User size={14} />
                          </div>
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 truncate max-w-[200px]">
                            {quote.display_name || 'Consumidor'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-tight ${cfg.color}`}>
                          <Icon size={11} /> {cfg.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400 italic">
                        {quote.user_name || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{fmtBRL(quote.total)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handlePrint(quote.id, 'Thermal')}
                            className="p-2 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all" title="Cupom Térmico">
                            <Receipt size={16} />
                          </button>
                          <button 
                            onClick={() => handlePrint(quote.id, 'A4')}
                            className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" title="Imprimir A4">
                            <Printer size={16} />
                          </button>
                          {quote.status === 'pending' && (
                            <button 
                              onClick={() => handleConvert(quote.id)}
                              className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Converter em Venda">
                              <ArrowRightLeft size={16} />
                            </button>
                          )}
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

      {/* Hidden Print Content */}
      <div className="hidden">
        <div id="quote-print-temp">
          {printing && (
            <QuotePrint 
              type={printing.type} 
              tenant={printing.tenant} 
              quote={printing.quote} 
              items={printing.items} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
