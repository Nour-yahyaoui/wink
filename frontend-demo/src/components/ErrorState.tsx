import type { AppError } from '../lib/errors';
import { IconAlert, IconRefresh } from './Icons';

export function ErrorState({
  error,
  onRetry,
  onClearFault,
  faultActive,
}: {
  error: AppError;
  onRetry?: () => void;
  onClearFault?: () => void;
  faultActive?: boolean;
}) {
  return (
    <div
      role="alert"
      style={{
        padding: 'var(--space-6)',
        background: 'var(--card)',
        border: '1px solid var(--danger)',
        borderRadius: 'var(--radius)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <span style={{ color: 'var(--danger)', marginTop: 2 }}>
          <IconAlert size={22} />
        </span>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: '0 0 6px',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: 500,
            }}
          >
            {error.title}
          </h3>
          <p style={{ margin: '0 0 12px', color: 'var(--muted)', maxWidth: '58ch' }}>
            {error.message}
          </p>
          <p className="mono-label" style={{ margin: '0 0 16px' }}>
            Reference ID: {error.errorId}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {error.retryable && onRetry && (
              <button type="button" className="btn btn-primary" onClick={onRetry}>
                <IconRefresh size={16} />
                <span>Try again</span>
              </button>
            )}
            {faultActive && onClearFault && (
              <button type="button" className="btn" onClick={onClearFault}>
                Disable fault simulator &amp; recover
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      style={{
        padding: 'var(--space-8) var(--space-5)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
      }}
    >
      <div className="mono-label" style={{ marginBottom: 8 }}>
        {eyebrow}
      </div>
      <h3
        style={{
          margin: '0 0 8px',
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 500,
        }}
      >
        {title}
      </h3>
      <p style={{ margin: '0 0 18px', color: 'var(--muted)', maxWidth: '54ch' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
