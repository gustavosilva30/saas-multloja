import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch, getAccessToken } from '@/lib/api';

const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';

interface MLAccount {
  id: string;
  nickname: string;
  is_active: boolean;
  created_at: string;
}

export function Ecommerce() {
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<MLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    // Verificar status na URL (vindo do callback do backend)
    const urlStatus = searchParams.get('status');
    const accountName = searchParams.get('account');
    const errorMsg = searchParams.get('message');

    if (urlStatus === 'success') {
      setStatus({ type: 'success', message: `Conta ${accountName} conectada com sucesso!` });
    } else if (urlStatus === 'error') {
      setStatus({ type: 'error', message: `Erro ao conectar: ${errorMsg}` });
    }

    loadAccounts();
  }, [searchParams]);

  const loadAccounts = async () => {
    try {
      const data = await apiFetch<{ accounts: MLAccount[] }>('/api/ecommerce/mercadolivre/accounts');
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectML = () => {
    // OAuth handshake — o token vai na URL (limitação do redirect).
    // TODO: trocar por state token assinado pelo backend para não vazar JWT em logs.
    const tk = getAccessToken();
    if (!tk) { alert('Sessão expirada — faça login novamente'); return; }
    window.location.href = `${API}/api/ecommerce/mercadolivre/auth?token=${tk}`;
  };

  const removeAccount = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta integração?')) return;
    try {
      await apiFetch(`/api/ecommerce/mercadolivre/accounts/${id}`, { method: 'DELETE' });
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert('Erro ao remover conta');
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">E-commerce</h2>
          <p className="text-blue-100 max-w-xl text-sm leading-relaxed">
            Conecte suas contas do Mercado Livre e gerencie seus anúncios e estoque de forma centralizada.
          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-700/50 to-transparent" />
      </div>

      {status && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
          status.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{status.message}</span>
          <button onClick={() => setStatus(null)} className="ml-auto text-xs underline">Fechar</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mercado Livre Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-sm">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-yellow-50/50 dark:bg-yellow-900/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
                <ShoppingBag size={20} className="text-zinc-900" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white">Mercado Livre</h3>
                <p className="text-[10px] uppercase tracking-wider font-bold text-yellow-600 dark:text-yellow-500">Marketplace</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 flex-1 space-y-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Sincronize estoque, preços e pedidos automaticamente com sua conta do Mercado Livre.
            </p>

            <div className="space-y-2">
              {accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{acc.nickname}</span>
                  </div>
                  <button 
                    onClick={() => removeAccount(acc.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button 
              onClick={handleConnectML}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              <Plus size={18} />
              Conectar Nova Conta
            </button>
          </div>
        </div>

        {/* Placeholder for other integrations */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
            <RefreshCw size={24} />
          </div>
          <div>
            <h4 className="font-bold text-zinc-400">Nuvemshop</h4>
            <p className="text-xs text-zinc-400">Em breve</p>
          </div>
        </div>

        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
            <RefreshCw size={24} />
          </div>
          <div>
            <h4 className="font-bold text-zinc-400">Shopify</h4>
            <p className="text-xs text-zinc-400">Em breve</p>
          </div>
        </div>
      </div>

      {/* Sync Status Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <RefreshCw size={20} className="text-blue-500" />
            Sincronização de Produtos
          </h3>
          <button className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            Ver mapeamento <ExternalLink size={14} />
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 mb-1">Total de Anúncios</p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">0</p>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 mb-1">Estoque Sincronizado</p>
            <p className="text-2xl font-black text-emerald-500">0%</p>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 mb-1">Vendas (Mês)</p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">R$ 0,00</p>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 mb-1">Status da API</p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-emerald-600">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
