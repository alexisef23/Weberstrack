import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[WeberTrack] Error capturado:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="glass rounded-3xl max-w-md w-full p-8 text-center shadow-[var(--shadow-xl)]">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-[var(--text)] mb-2" style={{ fontFamily: 'Syne,sans-serif' }}>
              Ocurrió un error
            </h1>
            <pre className="text-xs text-[var(--text-3)] bg-[var(--surface-2)] p-4 rounded-xl overflow-auto max-h-40 mb-5 text-left">
              {this.state.error.message}
            </pre>
            <p className="text-xs text-[var(--text-4)] mb-5">
              Abre la consola (F12) para ver más detalles.
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="btn btn-primary h-10 px-6 w-full"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
