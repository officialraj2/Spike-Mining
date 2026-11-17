import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error occurred.',
    };
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[SPIKE ErrorBoundary] Caught runtime error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      this.setState({ hasError: false, errorMessage: '' });
    }
  };

  private handleResetView = () => {
    try {
      localStorage.setItem('spike_active_tab', 'home');
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      window.history.replaceState({}, '', url.toString());
    } catch {}
    this.setState({ hasError: false, errorMessage: '' });
    try {
      window.location.reload();
    } catch {}
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError =
        /loading chunk|failed to fetch dynamically imported module|importing a module script failed/i.test(
          this.state.errorMessage
        );

      return (
        <div className="min-h-[60vh] w-full bg-[#051424] text-[#d4e4fa] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#0d1d2c] border border-[#00F0FF]/35 p-6 text-center shadow-[0_0_30px_rgba(0,240,255,0.15)] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[26px]">refresh</span>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold font-headline text-white">
                {this.props.fallbackTitle || (isChunkError ? 'App Update Available' : 'Display Recovery')}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isChunkError
                  ? 'A module failed to load during a server refresh. Click Try Again or Reload Preview to sync cleanly.'
                  : 'Something interrupted rendering in this view. Try Again or Reload to restore your session cleanly.'}
              </p>
              {this.state.errorMessage && (
                <p className="text-[11px] font-mono text-slate-400 bg-[#051424] border border-[#1c2b3b] rounded-lg px-3 py-2 break-words mt-2">
                  {this.state.errorMessage}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-4 py-2 rounded-xl bg-[#00F0FF] text-[#051424] font-headline font-bold text-xs hover:bg-[#7df4ff] transition-all cursor-pointer"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-[#122130] border border-[#00F0FF]/40 text-[#00F0FF] font-headline font-bold text-xs hover:bg-[#1c2b3b] transition-all cursor-pointer"
              >
                Reload Preview
              </button>
              <button
                type="button"
                onClick={this.handleResetView}
                className="px-4 py-2 rounded-xl bg-[#1c2b3b] text-slate-200 font-headline font-semibold text-xs hover:bg-[#273647] transition-all cursor-pointer"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
