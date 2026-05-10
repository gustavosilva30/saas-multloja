import { useState, useEffect } from 'react';
import { queue, Job } from '@/lib/queue';
import { ErrorBoundary, MiniErrorBoundary } from './ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Demo das 3 Camadas de Resiliência:
 * 1. Filas de Processamento (Background Jobs)
 * 2. Error Boundaries
 * 3. Audit Logs
 */

export function ResilienceDemo() {
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">🛡️ Demo de Resiliência</h1>
      
      {/* 1. Filas de Processamento */}
      <section className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">1. Filas de Processamento</h2>
        <JobQueueDemo />
      </section>

      {/* 2. Error Boundaries */}
      <section className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">2. Error Boundaries</h2>
        <ErrorBoundaryDemo />
      </section>

      {/* 3. Audit Logs */}
      <section className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">3. Audit Logs</h2>
        <AuditLogDemo />
      </section>
    </div>
  );
}

// ============================================================
// 1. DEMO DE FILAS
// ============================================================

function JobQueueDemo() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    return queue.subscribe(setJobs);
  }, []);

  const addJob = async (type: Job['type']) => {
    if (!profile?.tenant_id) return;
    
    await queue.add(type, { demo: true, timestamp: Date.now() }, {
      tenantId: profile.tenant_id,
      userId: profile.id,
      priority: 5,
    });
  };

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'retrying': return '🔁';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => addJob('generate_pdf')}
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          📄 Gerar PDF
        </button>
        <button
          onClick={() => addJob('export_data')}
          className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          📊 Exportar Dados
        </button>
        <button
          onClick={() => addJob('sync_marketplace')}
          className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          🔄 Sync ML
        </button>
        <button
          onClick={() => addJob('send_invoice')}
          className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          📧 Enviar NF
        </button>
      </div>

      <div className="bg-gray-50 rounded p-4">
        <h3 className="font-medium mb-2">Fila de Jobs ({jobs.length} total)</h3>
        <div className="grid grid-cols-4 gap-2 text-sm mb-4">
          <div className="bg-yellow-100 p-2 rounded text-center">
            ⏳ {jobs.filter(j => j.status === 'pending').length} Pendentes
          </div>
          <div className="bg-blue-100 p-2 rounded text-center">
            🔄 {jobs.filter(j => j.status === 'processing').length} Processando
          </div>
          <div className="bg-green-100 p-2 rounded text-center">
            ✅ {jobs.filter(j => j.status === 'completed').length} Completados
          </div>
          <div className="bg-red-100 p-2 rounded text-center">
            ❌ {jobs.filter(j => j.status === 'failed').length} Falhos
          </div>
        </div>

        <div className="space-y-2 max-h-60 overflow-auto">
          {jobs.slice(-10).reverse().map(job => (
            <div 
              key={job.id} 
              className={`p-2 rounded text-sm flex justify-between items-center ${
                job.status === 'failed' ? 'bg-red-50' :
                job.status === 'completed' ? 'bg-green-50' :
                job.status === 'processing' ? 'bg-blue-50' :
                'bg-gray-100'
              }`}
            >
              <span>
                {getStatusIcon(job.status)} {job.type}
              </span>
              <span className="text-gray-500">
                {new Date(job.createdAt).toLocaleTimeString()}
              </span>
              {job.status === 'failed' && (
                <button
                  onClick={() => queue.retry(job.id)}
                  className="text-xs px-2 py-1 bg-orange-500 text-white rounded"
                >
                  Retry
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 2. DEMO DE ERROR BOUNDARIES
// ============================================================

function ErrorBoundaryDemo() {
  const [shouldCrash, setShouldCrash] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Clique em "Simular Erro" para ver o Error Boundary em ação.
        O sistema inteiro continuará funcionando.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Sem Error Boundary - quebra tudo */}
        <div className="border border-red-300 rounded p-4">
          <h4 className="text-sm font-medium text-red-700 mb-2">
            ❌ Sem Error Boundary
          </h4>
          {shouldCrash && <CrashComponent />}
          {!shouldCrash && <div className="text-gray-400">Componente normal</div>}
        </div>

        {/* Com Error Boundary - isolado */}
        <div className="border border-green-300 rounded p-4">
          <h4 className="text-sm font-medium text-green-700 mb-2">
            ✅ Com Error Boundary
          </h4>
          <MiniErrorBoundary>
            {shouldCrash && <CrashComponent />}
            {!shouldCrash && <div className="text-gray-400">Componente protegido</div>}
          </MiniErrorBoundary>
        </div>
      </div>

      <button
        onClick={() => setShouldCrash(!shouldCrash)}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        {shouldCrash ? 'Recuperar' : 'Simular Erro'}
      </button>
    </div>
  );
}

// Componente que sempre quebra
function CrashComponent(): JSX.Element {
  throw new Error('💥 Erro simulado! Este componente quebrou.');
}

// ============================================================
// 3. DEMO DE AUDIT LOGS
// ============================================================

interface AuditLog { id: string; created_at: string; user_email: string; action: string; entity_type: string; entity_id: string; changed_fields?: string[]; }

function AuditLogDemo() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs?limit=10', { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } });
      const d = await res.json().catch(() => ({}));
      setLogs(d.logs || []);
    } catch { setLogs([]); }
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={loadLogs}
          disabled={loading}
          className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          📝 Carregar Logs
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4">Carregando...</div>
      ) : (
        <div className="bg-gray-50 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Hora</th>
                <th className="p-2 text-left">Usuário</th>
                <th className="p-2 text-left">Ação</th>
                <th className="p-2 text-left">Entidade</th>
                <th className="p-2 text-left">Alterações</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Nenhum log encontrado. Faça uma alteração no sistema para gerar logs.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-t">
                    <td className="p-2">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="p-2">{log.user_email}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-2">
                      {log.entity_type}:{log.entity_id.slice(0, 8)}
                    </td>
                    <td className="p-2">
                      {log.changed_fields?.join(', ') || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
        <strong>💡 Dica:</strong> Os audit logs são <strong>imutáveis</strong>. 
        Ninguém pode alterar ou deletar. Gera confiança com clientes e facilita auditorias.
      </div>
    </div>
  );
}

export default ResilienceDemo;
