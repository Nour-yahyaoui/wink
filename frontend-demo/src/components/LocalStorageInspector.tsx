import { useState } from 'react';
import { STORAGE_KEY } from '@db/localStorageDb';
import { FSM_VENUES } from '@db/mockData';
import type { DemoDatabase } from '@db/types';
import { IconCheck, IconDatabase, IconRefresh } from './Icons';

const EXAMPLE_ADAPTER_SNIPPET = `// database-demo/localStorageDb.ts — Typed LocalStorage DB Pattern
export const STORAGE_KEY = 'wink_fsm_demo_db_v1';

export function readDemoDbSync(): DemoDatabase {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const fresh = buildFreshSeedDatabase(); // 6 FSM students, 9 requests, 3 matches
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isValidDb(parsed)) return parsed; // Validates schemaVersion === 1 & arrays
  } catch {
    /* Self-heals corrupted JSON automatically */
  }
  const healed = buildFreshSeedDatabase();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(healed, null, 2));
  return healed;
}

// 5-Axis Intent Compatibility Check + Mutual Opt-In State Machine
export async function optInCompatibleRequest(myRequestId: string, targetRequestId: string) {
  const db = readDemoDbSync();
  const myReq = db.requests.find((r) => r.id === myRequestId)!;
  const targetReq = db.requests.find((r) => r.id === targetRequestId)!;

  const check = evaluateCompatibility(myReq, targetReq);
  if (!check.compatible) {
    throw new Error(\`Incompatible intent blocked: \${check.headlineReason}\`);
  }

  // Mutual choice unlocks public FSM venue & time confirmation only when BOTH opt in
  const match = findOrCreateMatch(db, myReq, targetReq);
  if (match.studentAOptIn && match.studentBOptIn) {
    match.status = 'arranging_details';
    match.proposedSlot = check.sharedSlots[0];
    match.proposedVenue = myReq.preferredVenue;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db, null, 2));
  return db;
}`;

interface LocalStorageInspectorProps {
  snapshot: DemoDatabase;
  storageBytes: number;
  faultEnabled: boolean;
  onToggleFault: (enabled: boolean) => void;
  onResetSeed: () => Promise<void>;
}

export function LocalStorageInspector({
  snapshot,
  storageBytes,
  faultEnabled,
  onToggleFault,
  onResetSeed,
}: LocalStorageInspectorProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [collectionView, setCollectionView] = useState<
    'matches' | 'requests' | 'students' | 'venues' | 'safety'
  >('matches');

  const venueCount = Object.keys(FSM_VENUES).length;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(EXAMPLE_ADAPTER_SNIPPET);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await onResetSeed();
    } finally {
      setResetting(false);
    }
  };

  const displayedSlice = (() => {
    switch (collectionView) {
      case 'matches':
        return snapshot.matches;
      case 'requests':
        return snapshot.requests;
      case 'students':
        return snapshot.students;
      case 'venues':
        return FSM_VENUES;
      case 'safety':
        return { blocks: snapshot.blocks, reports: snapshot.reports };
    }
  })();

  return (
    <section aria-label="LocalStorage database example and state inspector">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 'var(--space-4)',
          paddingBottom: 'var(--space-5)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div>
          <div className="mono-label">database-demo/localStorageDb.ts</div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              fontWeight: 400,
              margin: '6px 0 8px',
            }}
          >
            LocalStorage DB Adapter &amp; Live Mock Dataset
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', maxWidth: '62ch' }}>
            Every action in this Vercel demo reads and mutates{' '}
            <code>window.localStorage[&quot;{STORAGE_KEY}&quot;]</code> through an async,
            abort-aware repository boundary mirroring our planned production database contract in{' '}
            <code>plan/nour.md</code>.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <button type="button" className="btn" disabled={resetting} onClick={handleReset}>
            <IconRefresh size={16} />
            <span>{resetting ? 'Resetting…' : 'Reset FSM mock seed'}</span>
          </button>

          <button
            type="button"
            className={faultEnabled ? 'btn btn-danger' : 'btn'}
            onClick={() => onToggleFault(!faultEnabled)}
            aria-pressed={faultEnabled}
          >
            <span>
              {faultEnabled ? 'Fault Simulator: ON (Click to heal)' : 'Simulate DB Fault'}
            </span>
          </button>
        </div>
      </div>

      {/* Tabular Storage Telemetry Strip */}
      <div className="data-table-wrap" style={{ marginTop: 'var(--space-5)' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Storage Key</th>
              <th>Schema</th>
              <th>Payload Size</th>
              <th>FSM Students</th>
              <th>Activity Slips</th>
              <th>Match Stubs</th>
              <th>Public Venues</th>
              <th>Blocks / Reports</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>{STORAGE_KEY}</code>
              </td>
              <td className="num">v{snapshot.schemaVersion}</td>
              <td className="num">{(storageBytes / 1024).toFixed(2)} KB</td>
              <td className="num">{snapshot.students.length}</td>
              <td className="num">{snapshot.requests.length}</td>
              <td className="num">{snapshot.matches.length}</td>
              <td className="num">{venueCount}</td>
              <td className="num">
                {snapshot.blocks.length} / {snapshot.reports.length}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Reference Implementation Code Block */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-2)',
          }}
        >
          <span
            className="mono-label"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IconDatabase size={14} /> Reference TypeScript Example (LocalStorage Repository + 5-Axis Filter)
          </span>
          <button type="button" className="btn btn-sm" onClick={handleCopyCode}>
            {copiedCode ? <IconCheck size={15} /> : null}
            <span>{copiedCode ? 'Copied snippet' : 'Copy example code'}</span>
          </button>
        </div>

        <pre
          style={{
            margin: 0,
            padding: 'var(--space-4)',
            background: 'var(--card)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius)',
            overflowX: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            lineHeight: 1.55,
            color: 'var(--fg)',
          }}
        >
          <code>{EXAMPLE_ADAPTER_SNIPPET}</code>
        </pre>
      </div>

      {/* Live Persisted JSON Inspector */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(
              [
                ['matches', `Matches (${snapshot.matches.length})`],
                ['requests', `Requests (${snapshot.requests.length})`],
                ['students', `Students (${snapshot.students.length})`],
                ['venues', `Venues (${venueCount})`],
                ['safety', `Safety (${snapshot.blocks.length + snapshot.reports.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={collectionView === key ? 'btn btn-primary btn-sm' : 'btn btn-sm'}
                onClick={() => setCollectionView(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <button type="button" className="btn btn-sm" onClick={handleCopyJson}>
            {copiedJson ? <IconCheck size={15} /> : null}
            <span>{copiedJson ? 'Copied full JSON' : 'Copy full DB JSON'}</span>
          </button>
        </div>

        <pre
          style={{
            margin: 0,
            maxHeight: 400,
            overflow: 'auto',
            padding: 'var(--space-4)',
            background: 'var(--subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            lineHeight: 1.5,
          }}
        >
          <code>{JSON.stringify(displayedSlice, null, 2)}</code>
        </pre>
      </div>
    </section>
  );
}
