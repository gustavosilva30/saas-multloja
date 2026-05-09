import React, { Component, ReactNode, ErrorInfo, useState, useCallback } from 'react';

// ============================================================
// ERROR BOUNDARY - TRATAMENTO DE ERROS GLOBAL
// ============================================================
// Garante que se um componente quebrar, o sistema inteiro
// não fique com tela branca - apenas o componente afetado
// mostra um aviso de "Erro ao carregar"
// ============================================================

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Global
 * Captura erros de renderização em toda a aplicação
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log para análise
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Callback externo (ex: enviar para Sentry)
    this.props.onError?.(error, errorInfo);
    
    // Log de auditoria
    logErrorToAudit({
      component: this.props.componentName || 'unknown',
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Fallback customizado ou padrão
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback 
          error={this.state.error}
          onRetry={this.handleRetry}
          componentName={this.props.componentName}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================================
// ERROR FALLBACK UI
// ============================================================

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  componentName?: string;
}

function ErrorFallback({ error, onRetry, componentName }: ErrorFallbackProps) {
  return (
    <div className="min-h-[200px] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-200 dark:border-red-800 p-6 max-w-md w-full">
        {/* Ícone de erro */}
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4">
          <svg 
            className="w-6 h-6 text-red-600 dark:text-red-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>

        {/* Título */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
          Erro ao carregar {componentName || 'componente'}
        </h3>

        {/* Mensagem */}
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
          Algo deu errado ao renderizar este componente. 
          O restante da aplicação continua funcionando normalmente.
        </p>

        {/* Detalhes técnicos (colapsado) */}
        {error && (
          <details className="mb-4">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              Ver detalhes técnicos
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto max-h-32 text-red-600">
              {error.message}
            </pre>
          </details>
        )}

        {/* Botões de ação */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            Recarregar página
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MINI ERROR BOUNDARY (para componentes menores)
// ============================================================

interface MiniErrorBoundaryProps {
  children: ReactNode;
  placeholder?: ReactNode;
}

interface MiniErrorBoundaryState {
  hasError: boolean;
}

/**
 * Mini Error Boundary - Versão simplificada para componentes pequenos
 * Ex: gráficos, widgets, cards
 */
export class MiniErrorBoundary extends React.Component<MiniErrorBoundaryProps, MiniErrorBoundaryState> {
  state: MiniErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MiniErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('MiniErrorBoundary caught error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.placeholder) {
        return this.props.placeholder;
      }

      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 text-center">
            Erro ao carregar
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-xs text-red-600 dark:text-red-400 underline hover:no-underline block mx-auto"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================
// SECTION ERROR BOUNDARY (para seções da página)
// ============================================================

interface SectionErrorBoundaryProps {
  children: ReactNode;
  sectionName: string;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

/**
 * Section Error Boundary - Para seções grandes da página
 * Ex: relatórios, tabelas complexas, dashboards
 */
export class SectionErrorBoundary extends React.Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`SectionErrorBoundary [${this.props.sectionName}]:`, error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-red-200 dark:border-red-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {this.props.sectionName} - Erro ao carregar
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Não foi possível carregar esta seção. Os outros dados da página estão disponíveis.
          </p>
          <button
            onClick={this.handleRetry}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Tentar carregar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================
// HOOK PARA ERROR BOUNDARY PROGRAMÁTICO
// ============================================================


interface UseErrorBoundaryReturn {
  error: Error | null;
  hasError: boolean;
  setError: (error: Error) => void;
  clearError: () => void;
  ErrorBoundaryWrapper: React.FC<{ children: ReactNode }>;
}

/**
 * Hook para criar error boundary programático
 * Útil quando precisa resetar o erro via código
 */
export function useErrorBoundary(componentName?: string): UseErrorBoundaryReturn {
  const [error, setErrorState] = useState<Error | null>(null);

  const setError = useCallback((err: Error) => {
    setErrorState(err);
    console.error(`[${componentName || 'Component'}] Error:`, err);
  }, [componentName]);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const ErrorBoundaryWrapper: React.FC<{ children: ReactNode }> = useCallback(
    ({ children }) => {
      if (error) {
        return (
          <ErrorFallback
            error={error}
            onRetry={clearError}
            componentName={componentName}
          />
        );
      }
      return <>{children}</>;
    },
    [error, clearError, componentName]
  );

  return {
    error,
    hasError: error !== null,
    setError,
    clearError,
    ErrorBoundaryWrapper,
  };
}

// ============================================================
// UTILITÁRIOS
// ============================================================

/**
 * Wrapper para funções async com tratamento de erro
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorHandler: (error: Error) => void
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }) as T;
}

/**
 * Log de erro para auditoria
 */
function logErrorToAudit(data: {
  component: string;
  error: string;
  stack?: string;
  componentStack?: string;
}): void {
  const event = {
    action: 'component_error',
    entityType: 'error',
    entityId: `error_${Date.now()}`,
    details: data,
    timestamp: new Date().toISOString(),
  };

  console.error('[AUDIT ERROR]', event);

  // Tentar salvar localmente
  try {
    const logs = JSON.parse(localStorage.getItem('nexus_error_logs') || '[]');
    logs.push(event);
    localStorage.setItem('nexus_error_logs', JSON.stringify(logs.slice(-500)));
  } catch (e) {
    // Ignora
  }
}

// ============================================================
// EXPORTS
// ============================================================

export default ErrorBoundary;
