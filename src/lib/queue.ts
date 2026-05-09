// ============================================================
// SISTEMA DE FILAS (Background Jobs)
// ============================================================
// Para ações pesadas: gerar PDFs, enviar notas fiscais, 
// sincronização com marketplaces, etc.
//
// Implementação usando Web Workers + IndexedDB local
// Para produção: substituir por Upstash QStash, BullMQ ou similar
// ============================================================

export type JobType = 
  | 'generate_pdf'
  | 'send_invoice'
  | 'sync_marketplace'
  | 'export_data'
  | 'backup_database'
  | 'process_webhook'
  | 'send_notification'
  | 'import_products';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

export interface Job {
  id: string;
  type: JobType;
  payload: Record<string, any>;
  status: JobStatus;
  priority: number; // 1-10 (10 = highest)
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: any;
  tenantId: string;
  userId?: string;
}

// ============================================================
// JOB PROCESSORS (Simulação - em produção seriam workers separados)
// ============================================================

const JOB_PROCESSORS: Record<JobType, (job: Job) => Promise<any>> = {
  async generate_pdf(job) {
    // Simula geração de PDF
    await simulateDelay(2000);
    return { url: `/api/reports/${job.payload.reportId}.pdf` };
  },

  async send_invoice(job) {
    // Simula envio de nota fiscal
    await simulateDelay(3000);
    if (Math.random() > 0.9) throw new Error('Falha na API da prefeitura');
    return { invoiceNumber: `NFE-${Date.now()}`, status: 'sent' };
  },

  async sync_marketplace(job) {
    // Simula sincronização com Mercado Livre
    await simulateDelay(5000);
    return { synced: job.payload.productIds?.length || 0 };
  },

  async export_data(job) {
    // Simula exportação de dados
    await simulateDelay(4000);
    return { fileUrl: `/api/exports/${job.id}.xlsx`, recordCount: 1000 };
  },

  async backup_database(job) {
    // Simula backup
    await simulateDelay(10000);
    return { backupUrl: `/backups/${job.id}.sql.gz`, size: '150MB' };
  },

  async process_webhook(job) {
    // Simula processamento de webhook
    await simulateDelay(1000);
    return { processed: true };
  },

  async send_notification(job) {
    // Simula envio de notificação
    await simulateDelay(500);
    return { delivered: true };
  },

  async import_products(job) {
    // Simula importação de produtos
    await simulateDelay(6000);
    return { imported: job.payload.products?.length || 0, failed: 0 };
  },
};

function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// QUEUE MANAGER
// ============================================================

class QueueManager {
  private jobs: Map<string, Job> = new Map();
  private listeners: Set<(jobs: Job[]) => void> = new Set();
  private processing = false;

  // Adicionar job à fila
  async enqueue(
    type: JobType,
    payload: Record<string, any>,
    options: {
      priority?: number;
      maxRetries?: number;
      tenantId: string;
      userId?: string;
    }
  ): Promise<Job> {
    const job: Job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      status: 'pending',
      priority: options.priority || 5,
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: options.tenantId,
      userId: options.userId,
    };

    this.jobs.set(job.id, job);
    this.persistJobs();
    this.notifyListeners();
    
    // Iniciar processamento se não estiver rodando
    if (!this.processing) {
      this.processQueue();
    }

    return job;
  }

  // Obter jobs por tenant
  getJobsByTenant(tenantId: string): Job[] {
    return Array.from(this.jobs.values())
      .filter(job => job.tenantId === tenantId)
      .sort((a, b) => {
        // Ordenar por prioridade (desc) e data (asc)
        if (a.priority !== b.priority) return b.priority - a.priority;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }

  // Obter jobs por status
  getJobsByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values())
      .filter(job => job.status === status);
  }

  // Cancelar job
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      this.jobs.delete(jobId);
      this.persistJobs();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  // Retry job falho
  async retryJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'failed' && job.retryCount < job.maxRetries) {
      job.status = 'pending';
      job.retryCount++;
      job.error = undefined;
      job.updatedAt = new Date().toISOString();
      this.persistJobs();
      this.notifyListeners();
      this.processQueue();
      return true;
    }
    return false;
  }

  // Limpar jobs antigos completados
  cleanupOldJobs(maxAgeHours = 24): number {
    const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [id, job] of this.jobs) {
      if (job.status === 'completed' || job.status === 'failed') {
        const jobTime = new Date(job.completedAt || job.updatedAt).getTime();
        if (jobTime < cutoff) {
          this.jobs.delete(id);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      this.persistJobs();
      this.notifyListeners();
    }

    return cleaned;
  }

  // Subscrever para atualizações
  subscribe(callback: (jobs: Job[]) => void): () => void {
    this.listeners.add(callback);
    // Enviar estado inicial
    callback(Array.from(this.jobs.values()));
    
    return () => this.listeners.delete(callback);
  }

  // Processar fila
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const pendingJobs = this.getJobsByStatus('pending');
      
      for (const job of pendingJobs) {
        await this.processJob(job);
      }
    } finally {
      this.processing = false;
      
      // Verificar se há mais jobs
      const remaining = this.getJobsByStatus('pending');
      if (remaining.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  // Processar job individual
  private async processJob(job: Job): Promise<void> {
    job.status = 'processing';
    job.startedAt = new Date().toISOString();
    job.updatedAt = job.startedAt;
    this.notifyListeners();

    try {
      const processor = JOB_PROCESSORS[job.type];
      if (!processor) {
        throw new Error(`No processor found for job type: ${job.type}`);
      }

      const result = await processor(job);
      
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date().toISOString();
      job.updatedAt = job.completedAt;

      // Log de auditoria
      logAuditEvent({
        action: 'job_completed',
        entityType: 'job',
        entityId: job.id,
        userId: job.userId,
        tenantId: job.tenantId,
        details: { jobType: job.type, result },
      });

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.updatedAt = new Date().toISOString();

      // Tentar retry automático
      if (job.retryCount < job.maxRetries) {
        job.status = 'retrying';
        setTimeout(() => this.retryJob(job.id), 5000 * (job.retryCount + 1));
      }

      // Log de erro
      logAuditEvent({
        action: 'job_failed',
        entityType: 'job',
        entityId: job.id,
        userId: job.userId,
        tenantId: job.tenantId,
        details: { 
          jobType: job.type, 
          error: job.error,
          retryCount: job.retryCount,
        },
      });
    }

    this.persistJobs();
    this.notifyListeners();
  }

  // Persistir no localStorage (em produção: Redis/DB)
  private persistJobs(): void {
    try {
      const jobsArray = Array.from(this.jobs.values());
      localStorage.setItem('nexus_queue_jobs', JSON.stringify(jobsArray));
    } catch (e) {
      console.error('Failed to persist jobs:', e);
    }
  }

  // Carregar do localStorage
  loadPersistedJobs(): void {
    try {
      const stored = localStorage.getItem('nexus_queue_jobs');
      if (stored) {
        const jobs: Job[] = JSON.parse(stored);
        this.jobs = new Map(jobs.map(j => [j.id, j]));
        
        // Reprocessar jobs que estavam em andamento
        for (const job of this.jobs.values()) {
          if (job.status === 'processing') {
            job.status = 'pending';
            job.updatedAt = new Date().toISOString();
          }
        }
        
        this.processQueue();
      }
    } catch (e) {
      console.error('Failed to load persisted jobs:', e);
    }
  }

  private notifyListeners(): void {
    const jobs = Array.from(this.jobs.values());
    this.listeners.forEach(cb => cb(jobs));
  }
}

// Singleton
export const queueManager = new QueueManager();

// ============================================================
// API SIMPLIFICADA
// ============================================================

export const queue = {
  // Adicionar job
  async add<T = any>(
    type: JobType,
    payload: Record<string, any>,
    options: { priority?: number; maxRetries?: number; tenantId: string; userId?: string }
  ): Promise<{ jobId: string; waitForResult: () => Promise<T> }> {
    const job = await queueManager.enqueue(type, payload, options);
    
    return {
      jobId: job.id,
      waitForResult: () => waitForJobResult<T>(job.id),
    };
  },

  // Obter status
  getStatus(jobId: string): JobStatus | null {
    return queueManager['jobs'].get(jobId)?.status || null;
  },

  // Cancelar
  cancel(jobId: string): boolean {
    return queueManager.cancelJob(jobId);
  },

  // Retry
  retry(jobId: string): Promise<boolean> {
    return queueManager.retryJob(jobId);
  },

  // Listar jobs do tenant
  list(tenantId: string): Job[] {
    return queueManager.getJobsByTenant(tenantId);
  },

  // Subscrever
  subscribe(callback: (jobs: Job[]) => void) {
    return queueManager.subscribe(callback);
  },

  // Cleanup
  cleanup(maxAgeHours?: number): number {
    return queueManager.cleanupOldJobs(maxAgeHours);
  },
};

// Aguardar resultado de job
function waitForJobResult<T>(jobId: string, timeout = 60000): Promise<T> {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      const job = queueManager['jobs'].get(jobId);
      
      if (!job) {
        clearInterval(checkInterval);
        reject(new Error('Job not found'));
        return;
      }

      if (job.status === 'completed') {
        clearInterval(checkInterval);
        resolve(job.result as T);
        return;
      }

      if (job.status === 'failed') {
        clearInterval(checkInterval);
        reject(new Error(job.error || 'Job failed'));
        return;
      }
    }, 500);

    // Timeout
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('Job timeout'));
    }, timeout);
  });
}

// ============================================================
// AUDIT LOG (para uso dentro do queue)
// ============================================================

interface AuditEvent {
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  tenantId: string;
  details?: Record<string, any>;
  timestamp?: string;
}

function logAuditEvent(event: AuditEvent): void {
  const fullEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  
  // Em produção: enviar para Supabase audit_logs
  console.log('[AUDIT]', fullEvent);
  
  // Tentar salvar no localStorage para demo
  try {
    const logs = JSON.parse(localStorage.getItem('nexus_audit_logs') || '[]');
    logs.push(fullEvent);
    localStorage.setItem('nexus_audit_logs', JSON.stringify(logs.slice(-1000)));
  } catch (e) {
    // Ignora erros de storage
  }
}

// Inicializar
queueManager.loadPersistedJobs();
