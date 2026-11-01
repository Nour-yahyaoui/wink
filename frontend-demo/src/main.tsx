import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './components/ThemeProvider';
import { toAppError } from './lib/errors';
import './styles/tokens.css';

interface BoundaryState {
  hasError: boolean;
  errorId: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  BoundaryState
> {
  state: BoundaryState = { hasError: false, errorId: '' };

  static getDerivedStateFromError(err: unknown): BoundaryState {
    const mapped = toAppError(err);
    return { hasError: true, errorId: mapped.errorId };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="board-shell" style={{ paddingTop: '3rem' }}>
          <div className="perforated-slip" style={{ maxWidth: 560, margin: '0 auto' }}>
            <div className="slip-upper">
              <span className="mono-label">Unexpected UI Interruption</span>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.75rem',
                  fontWeight: 400,
                  margin: '10px 0 8px',
                }}
              >
                Something interrupted the campus board.
              </h1>
              <p style={{ margin: 0, color: 'var(--muted)' }}>
                Your localStorage activity slips remain intact. Reload the board or reset demo
                storage if needed. (Ref {this.state.errorId})
              </p>
            </div>
            <hr className="slip-perforation" />
            <div className="slip-lower" style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                Reload board
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  window.localStorage.removeItem('wink_fsm_demo_db_v1');
                  window.localStorage.removeItem('wink_fsm_simulate_fault');
                  window.location.reload();
                }}
              >
                Reset demo DB &amp; reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root mount element');

createRoot(rootElement).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </RootErrorBoundary>
  </React.StrictMode>
);
