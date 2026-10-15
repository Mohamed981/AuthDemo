import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../lib/reportError';

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Last line of defence: a render crash shows a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, `render${info.componentStack ? `\n${info.componentStack}` : ''}`);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="page">
        <section className="card">
          <h1>Something went wrong</h1>
          <p className="subtitle">An unexpected error occurred. Reloading the page usually fixes it.</p>
          <button type="button" className="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </section>
      </main>
    );
  }
}
