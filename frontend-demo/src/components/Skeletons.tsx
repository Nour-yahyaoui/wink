import React, { useEffect, useState } from 'react';

/**
 * Delays showing skeletons for 120ms so fast localStorage reads never flash,
 * while slower / simulated-latency reads render layout-matched placeholders (zero CLS).
 */
export function DelayedSkeleton({
  delayMs = 120,
  children,
}: {
  delayMs?: number;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!visible) {
    return <div style={{ minHeight: 320 }} aria-busy="true" />;
  }

  return <div aria-busy="true" aria-label="Loading campus activity slips">{children}</div>;
}

export function BoardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <DelayedSkeleton>
      <div className="slip-list">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="request-row">
            <div>
              <div className="skeleton-block" style={{ width: '34%', height: 14, marginBottom: 12 }} />
              <div className="skeleton-block" style={{ width: '78%', height: 26, marginBottom: 12 }} />
              <div className="skeleton-block" style={{ width: '92%', height: 16, marginBottom: 8 }} />
              <div className="skeleton-block" style={{ width: '64%', height: 16 }} />
            </div>
            <div>
              <div className="skeleton-block" style={{ width: '100%', height: 44, marginBottom: 10 }} />
              <div className="skeleton-block" style={{ width: '70%', height: 14 }} />
            </div>
          </div>
        ))}
      </div>
    </DelayedSkeleton>
  );
}
