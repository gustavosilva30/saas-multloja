import { useState, useEffect } from 'react';
import { Phone, QrCode, LogOut, CheckCircle2, AlertCircle, Loader2, MessageCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export function WhatsApp() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'loading'>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await apiFetch<{ status: string }>('/api/whatsapp/status');
      setStatus(data.status === 'open' ? 'connected' : 'disconnected');
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    let interval: any;
    if (status === 'disconnected' || status === 'connecting') {
      interval = setInterval(fetchStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleConnect = async () => {
    setLoading(true);
    setStatus('connecting');
    try {
      const data = await apiFetch<{ code?: string }>('/api/whatsapp/connect', { method: 'POST' });
      if (data.code) setQrCode(data.code);
    } catch (error) {
      console.error('Error connecting:', error);
      setStatus('disconnected');
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    if (!confirm('Deseja realmente desconectar o WhatsApp?')) return;
    setLoading(true);
    try {
      await apiFetch('/api/whatsapp/logout', { method: 'POST' });
      setStatus('disconnected');
      setQrCode(null);
    } catch (error) {
      console.error('Error logging out:', error);
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            status === 'connected' ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'
          }`}>
            <Phone size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">WhatsApp Integration</h1>
            <p className="text-zinc-500 text-sm">Conecte sua conta para automações e atendimento.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {status === 'connected' ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <CheckCircle2 size={16} /> Conectado
            </div>
          ) : status === 'loading' ? (
            <Loader2 className="animate-spin text-zinc-400" />
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <AlertCircle size={16} /> Desconectado
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Connection Card */}
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-full">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Conectar Dispositivo</h2>
            <p className="text-sm text-zinc-500">Escaneie o código QR com seu WhatsApp para ativar a integração.</p>
          </div>

          {status === 'connected' ? (
            <div className="py-8 space-y-4">
              <CheckCircle2 size={64} className="text-emerald-500 mx-auto" />
              <p className="text-sm text-zinc-500 font-medium italic">Seu WhatsApp está pronto para uso!</p>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center gap-2 mx-auto text-red-500 hover:text-red-600 text-sm font-bold pt-4"
              >
                <LogOut size={16} /> Desconectar Instância
              </button>
            </div>
          ) : qrCode ? (
            <div className="bg-white p-4 rounded-2xl shadow-inner border-2 border-zinc-100">
              <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
              <p className="text-[10px] text-zinc-400 mt-2 uppercase tracking-widest font-bold">Aguardando leitura...</p>
            </div>
          ) : (
            <div className="py-12 px-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 w-full flex flex-col items-center gap-4">
              <QrCode size={48} className="text-zinc-300" />
              <button
                onClick={handleConnect}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
                Gerar Novo QR Code
              </button>
            </div>
          )}
        </div>

        {/* Features/Info Card */}
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Recursos Ativos</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                <MessageCircle size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Aprovação de OS</h3>
                <p className="text-xs text-zinc-500 mt-1">Envie orçamentos e solicite aprovação diretamente pelo chat.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700">
              <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
                <AlertCircle size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Notificações Automáticas</h3>
                <p className="text-xs text-zinc-500 mt-1">Alertas de vencimento, cobrança e boas-vindas para clientes.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>Dica:</strong> Evite enviar mensagens em massa para números que não têm você nos contatos para reduzir o risco de banimento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
