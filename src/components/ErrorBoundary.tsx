import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { MasonicLogo } from './MasonicLogo';
import { safeRemoveItem } from '../utils/storageUtils';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled runtime error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      safeRemoveItem('masonic_members');
      safeRemoveItem('masonic_sessions');
      safeRemoveItem('masonic_attendances');
      safeRemoveItem('masonic_visitors');
      safeRemoveItem('masonic_justifications');
      safeRemoveItem('masonic_balaustres');
      safeRemoveItem('masonic_auth_user');
      window.location.href = window.location.origin + window.location.pathname;
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <MasonicLogo size="lg" className="mx-auto border-2 border-amber-400/50 shadow-xl shadow-amber-950/60" />

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded border border-amber-800/50 inline-block mb-1">
                A∴R∴L∴S∴ FRATERNIDADE DA FRANCA Nº3571
              </span>
              <h2 className="font-serif-masonic text-xl font-bold text-slate-100 mt-2 flex items-center justify-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Recuperação do Sistema</span>
              </h2>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Ocorreu uma oscilação temporária na renderização dos dados. Você pode recarregar a página ou redefinir a sessão para continuar normalmente.
            </p>

            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-rose-300 font-mono text-left max-h-24 overflow-y-auto">
                {this.state.error.message || 'Erro inesperado'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Página</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-4 py-3 rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Reiniciar Sessão</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
