# Guia de Resiliência - Sistema com Falhas Mínimas

Este guia cobre as três camadas de resiliência implementadas no NexusERP.

---

## 1. 🔄 Filas de Processamento (Background Jobs)

### Conceito
Ações pesadas (gerar PDF, enviar nota fiscal, sincronização) não travam a interface. São enviadas para uma fila e processadas em background.

### Uso

```typescript
import { queue } from '@/lib/queue';

// Enviar job para a fila
const { jobId, waitForResult } = await queue.add('generate_pdf', {
  reportId: '123',
  template: 'invoice',
  data: saleData,
}, {
  priority: 8,
  tenantId: currentTenant,
  userId: currentUser,
});

// Opcional: aguardar resultado
const result = await waitForResult();
console.log('PDF gerado:', result.url);
```

### Tipos de Jobs Disponíveis

| Job Type | Descrição | Tempo Estimado |
|----------|-----------|----------------|
| `generate_pdf` | Gera relatórios/PDFs | 2-5s |
| `send_invoice` | Envia nota fiscal | 3-10s |
| `sync_marketplace` | Sincroniza com ML | 5-30s |
| `export_data` | Exporta dados (Excel/CSV) | 4-10s |
| `backup_database` | Backup do banco | 10-60s |
| `process_webhook` | Processa webhooks | 1-3s |
| `send_notification` | Envia notificações | <1s |
| `import_products` | Importa produtos em massa | 6-60s |

### Monitoramento de Jobs

```typescript
import { queue } from '@/lib/queue';

// Listar jobs do tenant
const jobs = queue.list(tenantId);

// Subscrever para atualizações em tempo real
queue.subscribe((allJobs) => {
  const pending = allJobs.filter(j => j.status === 'pending');
  const processing = allJobs.filter(j => j.status === 'processing');
  console.log(`Fila: ${pending.length} pendentes, ${processing.length} processando`);
});

// Cancelar job pendente
queue.cancel(jobId);

// Retry job falho
queue.retry(jobId);
```

### UI de Fila (Exemplo)

```tsx
import { useState, useEffect } from 'react';
import { queue, Job } from '@/lib/queue';

function JobQueueMonitor() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    return queue.subscribe(setJobs);
  }, []);

  const pending = jobs.filter(j => j.status === 'pending');
  const processing = jobs.filter(j => j.status === 'processing');
  const failed = jobs.filter(j => j.status === 'failed');

  return (
    <div>
      <span>⏳ {pending.length}</span>
      <span>🔄 {processing.length}</span>
      <span>❌ {failed.length}</span>
      
      {failed.map(job => (
        <div key={job.id}>
          Erro: {job.error}
          <button onClick={() => queue.retry(job.id)}>
            Tentar novamente
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 2. 🛡️ Error Boundaries

### Conceito
Se um componente quebrar, o sistema inteiro não fica com tela branca. Apenas o componente afetado mostra "Erro ao carregar".

### Uso

```tsx
import { ErrorBoundary, MiniErrorBoundary, SectionErrorBoundary } from '@/components/ErrorBoundary';

// 1. Proteção Global (App.tsx)
<ErrorBoundary>
  <App />
</ErrorBoundary>

// 2. Proteção de Seção (Dashboard, Relatórios)
<SectionErrorBoundary sectionName="Relatório Financeiro">
  <FinancialReportChart data={data} />
</SectionErrorBoundary>

// 3. Proteção de Componente Pequeno (Widgets, Cards)
<MiniErrorBoundary>
  <SalesWidget />
</MiniErrorBoundary>
```

### Guards de Permissão (UI condicional)

```tsx
import { 
  AdminOnly, 
  CanViewProfit, 
  OperatorPlus,
  PermissionGuard 
} from '@/components/ProtectedRoute';

// Esconder lucro de operadores
<CanViewProfit fallback={<span>---</span>}>
  <span>Lucro: R$ {profit}</span>
</CanViewProfit>

// Botões de admin apenas
<AdminOnly>
  <button onClick={deleteSale}>Excluir Venda</button>
</AdminOnly>

// Por permissão específica
<PermissionGuard permission="canManageUsers">
  <UserManagementPanel />
</PermissionGuard>
```

### Hook useErrorBoundary

```tsx
import { useErrorBoundary } from '@/components/ErrorBoundary';

function MyComponent() {
  const { setError, clearError, ErrorBoundaryWrapper, hasError } = useErrorBoundary('MyComponent');

  const handleAction = async () => {
    try {
      await riskyOperation();
    } catch (err) {
      setError(err as Error);
    }
  };

  return (
    <ErrorBoundaryWrapper>
      <button onClick={handleAction}>
        {hasError ? 'Tentar novamente' : 'Executar'}
      </button>
    </ErrorBoundaryWrapper>
  );
}
```

---

## 3. 📝 Audit Logs (Logs Imutáveis)

### Conceito
TODAS as alterações são registradas. Se um valor sumir do caixa, o Admin vê: "Usuário X alterou Venda Y às 14:00". Gera confiança no cliente.

### Estrutura do Log

```typescript
interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  user_email: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'LOGIN';
  entity_type: 'sale' | 'product' | 'customer' | 'financial_transaction';
  entity_id: string;
  old_data: JSON;      // Dados anteriores
  new_data: JSON;      // Dados novos
  changed_fields: string[];  // ['total', 'status']
  created_at: string;
}
```

### Uso no Frontend

```typescript
import { auditApi, logManualAudit } from '@/lib/supabase';

// 1. Buscar histórico de uma venda
const { data: history } = await auditApi.getEntityHistory('sale', saleId);

// 2. Buscar alterações de um usuário
const { data: userChanges } = await auditApi.getUserHistory(userId, startDate, endDate);

// 3. Detectar alterações suspeitas
const { data: suspicious } = await auditApi.getSuspiciousChanges();

// 4. Listar logs com filtros
const { data: logs } = await auditApi.list({
  action: 'UPDATE',
  entityType: 'sale',
  startDate: '2024-01-01',
  limit: 50,
});

// 5. Log manual (para ações específicas do frontend)
await logManualAudit({
  action: 'EXPORT',
  entityType: 'sales_report',
  entityId: reportId,
  metadata: { format: 'pdf', recordCount: 100 },
});
```

### Exemplo de UI de Auditoria

```tsx
function AuditLogViewer({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    auditApi.getEntityHistory(entityType, entityId).then(({ data }) => {
      setLogs(data || []);
    });
  }, [entityType, entityId]);

  return (
    <div className="audit-log">
      {logs.map(log => (
        <div key={log.id} className="log-entry">
          <span>{formatDate(log.created_at)}</span>
          <span>{log.user_email}</span>
          <span className={`action-${log.action}`}>{log.action}</span>
          {log.changed_fields && (
            <span>Campos: {log.changed_fields.join(', ')}</span>
          )}
          {log.old_data && log.new_data && (
            <div className="diff">
              <span>De: {JSON.stringify(log.old_data)}</span>
              <span>Para: {JSON.stringify(log.new_data)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 📊 Dashboard de Resiliência

### Métricas Recomendadas

```typescript
// Métricas de Fila
const queueMetrics = {
  pendingJobs: jobs.filter(j => j.status === 'pending').length,
  processingJobs: jobs.filter(j => j.status === 'processing').length,
  failedJobs: jobs.filter(j => j.status === 'failed').length,
  avgProcessingTime: calculateAvgTime(jobs),
};

// Métricas de Erros
const errorMetrics = {
  errorsToday: countErrorsSince(new Date(Date.now() - 24 * 60 * 60 * 1000)),
  mostProblematicComponent: getMostErrors(),
  recoveryRate: calculateRecoveryRate(),
};

// Métricas de Auditoria
const auditMetrics = {
  changesToday: logs.filter(l => l.created_at > today).length,
  suspiciousChanges: suspicious.length,
  topModifier: getTopModifier(),
};
```

---

## 🔧 Configuração em Produção

### 1. Filas: Migrar para Redis/Upstash

```typescript
// Atualmente: localStorage (demo)
// Produção: Upstash QStash

import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Enviar job
await qstash.publishJSON({
  url: `${process.env.API_URL}/jobs/process`,
  body: { type: 'generate_pdf', payload: data },
});
```

### 2. Error Boundaries: Integrar com Sentry

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// No Error Boundary
componentDidCatch(error, errorInfo) {
  Sentry.captureException(error, {
    extra: { componentStack: errorInfo.componentStack },
  });
}
```

### 3. Audit Logs: Retenção e Arquivamento

```sql
-- Política de retenção (ex: manter 1 ano)
CREATE POLICY audit_retention ON audit_logs
  FOR DELETE USING (created_at < NOW() - INTERVAL '1 year');

-- Arquivamento mensal para cold storage
-- (Implementar via cron job)
```

---

## 🎯 Checklist de Implementação

- [ ] Executar schema SQL atualizado (com audit_logs)
- [ ] Instalar dependências: `npm install @supabase/supabase-js`
- [ ] Configurar variáveis de ambiente Supabase
- [ ] Ativar triggers de auditoria no Supabase
- [ ] Testar filas com jobs de exemplo
- [ ] Verificar error boundaries em ação (simular erro)
- [ ] Criar interface de auditoria para admins
- [ ] Configurar alertas para alterações suspeitas

---

## 📚 Arquivos Relacionados

- `@/src/lib/queue.ts` - Sistema de filas
- `@/src/components/ErrorBoundary.tsx` - Error boundaries
- `@/src/lib/supabase.ts` - API de audit logs
- `@/src/data/supabase_schema.sql` - Schema com triggers de auditoria
