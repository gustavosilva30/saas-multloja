import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Clock, Wrench, Package, AlertCircle, Loader2 } from 'lucide-react';

interface OsItem {
  item_type: 'SERVICE' | 'PRODUCT';
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

interface OsPublic {
  os_number: number;
  status: string;
  asset_metadata: Record<string, string>;
  customer_notes: string | null;
  expected_at: string | null;
  subtotal: number;
  discount: number;
  total: number;
  created_at: string;
  customer_name: string | null;
  tenant_name: string;
  items: OsItem[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:            { label: 'Rascunho',           color: 'text-gray-400'   },
  PENDING_APPROVAL: { label: 'Aguardando Aprovação', color: 'text-yellow-400' },
  APPROVED:         { label: 'Aprovada',            color: 'text-emerald-400' },
  IN_PROGRESS:      { label: 'Em Andamento',        color: 'text-blue-400'   },
  WAITING_PARTS:    { label: 'Aguard. Peças',       color: 'text-orange-400' },
  COMPLETED:        { label: 'Concluída',           color: 'text-emerald-400' },
  CANCELED:         { label: 'Cancelada',           color: 'text-red-400'    },
};

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function OsPublicView() {
  const { token } = useParams<{ token: string }>();
  const [os, setOs] = useState<OsPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/public/os/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.service_order) setOs(data.service_order);
        else setError(data.error ?? 'OS não encontrada');
      })
      .catch(() => setError('Falha ao carregar a Ordem de Serviço'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleApprove = async () => {
    if (!token) return;
    setApproving(true);
    try {
      const r = await fetch(`${API}/api/public/os/${token}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_signature: os?.customer_name ?? undefined }),
      });
      const data = await r.json();
      if (r.ok) {
        setApproved(true);
        setOs(prev => prev ? { ...prev, status: 'APPROVED' } : prev);
      } else {
        alert(data.error ?? 'Erro ao aprovar');
      }
    } catch {
      alert('Falha de conexão');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (error || !os) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold">{error ?? 'OS não encontrada'}</p>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[os.status] ?? { label: os.status, color: 'text-gray-400' };
  const services = os.items.filter(i => i.item_type === 'SERVICE');
  const products = os.items.filter(i => i.item_type === 'PRODUCT');
  const canApprove = os.status === 'PENDING_APPROVAL' && !approved;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-white/10 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">{os.tenant_name}</p>
            <h1 className="text-lg font-bold text-white">OS-{String(os.os_number).padStart(4, '0')}</h1>
          </div>
          <span className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* Cliente + ativo */}
        <div className="bg-gray-900 rounded-xl p-4 space-y-2">
          {os.customer_name && (
            <p className="text-sm text-white/60">
              Cliente: <span className="text-white font-medium">{os.customer_name}</span>
            </p>
          )}
          <p className="text-xs text-white/40">
            Emitida em {fmtDate(os.created_at)}
            {os.expected_at && ` · Previsão: ${fmtDate(os.expected_at)}`}
          </p>

          {Object.keys(os.asset_metadata).length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-1">
              {Object.entries(os.asset_metadata).map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-white/40 capitalize">{k}</p>
                  <p className="text-sm text-white font-medium">{String(v)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Serviços */}
        {services.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={15} className="text-emerald-400" />
              <span className="text-sm font-semibold text-white/80">Mão de Obra</span>
            </div>
            <div className="space-y-2">
              {services.map((it, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-white/70">{it.description}</span>
                  <span className="text-white font-medium">{fmt(it.total_price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Peças */}
        {products.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package size={15} className="text-blue-400" />
              <span className="text-sm font-semibold text-white/80">Peças e Materiais</span>
            </div>
            <div className="space-y-2">
              {products.map((it, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-white/70">
                    {it.description}
                    <span className="text-white/40"> × {it.quantity}</span>
                  </span>
                  <span className="text-white font-medium">{fmt(it.total_price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totais */}
        <div className="bg-gray-900 rounded-xl p-4 space-y-1">
          <div className="flex justify-between text-sm text-white/60">
            <span>Subtotal</span><span>{fmt(os.subtotal)}</span>
          </div>
          {os.discount > 0 && (
            <div className="flex justify-between text-sm text-red-400">
              <span>Desconto</span><span>- {fmt(os.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-white border-t border-white/10 pt-2 mt-2">
            <span>Total</span><span className="text-emerald-400">{fmt(os.total)}</span>
          </div>
        </div>

        {/* Observações do cliente */}
        {os.customer_notes && (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-white/40 mb-1">Observações</p>
            <p className="text-sm text-white/70">{os.customer_notes}</p>
          </div>
        )}

        {/* Botão de aprovação */}
        {canApprove && (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60
                       text-white font-bold text-base flex items-center justify-center gap-2 transition-colors"
          >
            {approving
              ? <Loader2 size={18} className="animate-spin" />
              : <CheckCircle size={18} />
            }
            {approving ? 'Aprovando…' : 'Aprovar Orçamento'}
          </button>
        )}

        {(approved || os.status === 'APPROVED') && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <CheckCircle className="text-emerald-400 shrink-0" size={20} />
            <p className="text-sm text-emerald-300 font-medium">
              Orçamento aprovado! Em breve entraremos em contato.
            </p>
          </div>
        )}

        {os.status === 'COMPLETED' && (
          <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <CheckCircle className="text-blue-400 shrink-0" size={20} />
            <p className="text-sm text-blue-300 font-medium">
              Seu serviço está concluído e pronto para retirada!
            </p>
          </div>
        )}

        <p className="text-center text-xs text-white/20 pb-4">
          {os.tenant_name} · Powered by NexusERP
        </p>
      </div>
    </div>
  );
}
