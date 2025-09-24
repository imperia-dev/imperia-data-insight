import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorInfo: null 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Log to Supabase in production
    if (import.meta.env.PROD) {
      this.logErrorToSupabase(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  private async logErrorToSupabase(error: Error, errorInfo: ErrorInfo) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('security_events').insert({
        event_type: 'frontend_error',
        severity: 'error',
        user_id: user?.id,
        details: {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      // Silently fail - don't throw errors in error boundary
      console.error('Failed to log error to Supabase:', logError);
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Oops! Algo deu errado</AlertTitle>
              <AlertDescription>
                {import.meta.env.DEV ? (
                  <div className="mt-2">
                    <p className="font-semibold">Erro:</p>
                    <pre className="mt-1 text-xs overflow-auto p-2 bg-secondary rounded">
                      {this.state.error?.message}
                    </pre>
                  </div>
                ) : (
                  <p className="mt-2">
                    Encontramos um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver o problema.
                  </p>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button 
                onClick={this.handleReset}
                variant="outline"
                className="flex-1"
              >
                Tentar Novamente
              </Button>
              <Button 
                onClick={this.handleReload}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Recarregar Página
              </Button>
            </div>

            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mt-4 p-4 bg-secondary rounded-lg">
                <summary className="cursor-pointer font-semibold text-sm">
                  Stack Trace (Development Only)
                </summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}