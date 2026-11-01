import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  STORAGE_KEY,
  confirmMatchLogistics,
  createActivityRequest,
  evaluateCompatibility,
  getStorageByteSize,
  isFaultSimulationEnabled,
  loadDemoDatabase,
  optInCompatibleRequest,
  proposeMatchLogistics,
  reportAndOptionallyBlock,
  resetDemoDatabase,
  setFaultSimulation,
  switchActiveStudent,
  withdrawActivityRequest,
  withdrawOrCancelMatch,
  submitMeetCheckIn,
  type CreateRequestInput,
} from '@db/localStorageDb';
import {
  ACTIVITY_META,
  FSM_VENUES,
  PURPOSE_LABELS,
  ROLE_LABELS,
  TIME_SLOTS,
} from '@db/mockData';
import type {
  ActivityRequest,
  CompatibilityEvaluation,
  DemoDatabase,
  FsmVenueId,
  SafetyReport,
  StudentProfile,
  TimeSlotId,
} from '@db/types';
import { CreateRequestModal } from './components/CreateRequestModal';
import { EmptyState, ErrorState } from './components/ErrorState';
import {
  IconCheck,
  IconClock,
  IconCompass,
  IconDatabase,
  IconMapPin,
  IconPlus,
  IconShield,
  IconUserSwitch,
  IconX,
} from './components/Icons';
import { LocalStorageInspector } from './components/LocalStorageInspector';
import { MutualMatchSlip } from './components/MutualMatchSlip';
import { OnboardingTour } from './components/OnboardingTour';
import { BoardSkeletonList } from './components/Skeletons';
import { ThemeToggle } from './components/ThemeProvider';
import { toAppError, withTimeout, type AppError } from './lib/errors';

type ActiveTab = 'compatible' | 'matches' | 'mine' | 'db';

export function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [snapshot, setSnapshot] = useState<DemoDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<AppError | null>(null);
  const [actionError, setActionError] = useState<AppError | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('compatible');
  const [selectedAnchorId, setSelectedAnchorId] = useState<string>('');
  const [showFilteredWhy, setShowFilteredWhy] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [safetyTarget, setSafetyTarget] = useState<{
    student: StudentProfile;
    requestId: string | null;
  } | null>(null);
  const [safetyReason, setSafetyReason] = useState<SafetyReport['reason']>('mismatched_intent');
  const [safetyNotes, setSafetyNotes] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tourTrigger, setTourTrigger] = useState(0);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [faultEnabled, setFaultEnabledState] = useState(() => isFaultSimulationEnabled());

  const abortRef = useRef<AbortController | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const refreshBoard = useCallback(async (showSkeleton = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (showSkeleton) setLoading(true);
    setLoadError(null);

    try {
      const data = await withTimeout(loadDemoDatabase(controller.signal));
      if (!controller.signal.aborted) {
        setSnapshot(data);
        setFaultEnabledState(isFaultSimulationEnabled());
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setLoadError(toAppError(err));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshBoard(true);
    return () => abortRef.current?.abort();
  }, [refreshBoard]);

  // Derived entities
  const currentStudent = useMemo(() => {
    if (!snapshot) return null;
    return (
      snapshot.students.find((s) => s.id === snapshot.activeStudentId) ||
      snapshot.students[0] ||
      null
    );
  }, [snapshot]);

  const myOpenRequests = useMemo(() => {
    if (!snapshot || !currentStudent) return [];
    return snapshot.requests.filter(
      (r) => r.authorId === currentStudent.id && r.status !== 'cancelled'
    );
  }, [snapshot, currentStudent]);

  useEffect(() => {
    if (myOpenRequests.length === 0) {
      setSelectedAnchorId('');
      return;
    }
    if (!myOpenRequests.some((r) => r.id === selectedAnchorId)) {
      setSelectedAnchorId(myOpenRequests[0].id);
    }
  }, [myOpenRequests, selectedAnchorId]);

  const anchorRequest = useMemo(
    () => myOpenRequests.find((r) => r.id === selectedAnchorId) || myOpenRequests[0] || null,
    [myOpenRequests, selectedAnchorId]
  );

  const blockedUserIds = useMemo(() => {
    if (!snapshot || !currentStudent) return new Set<string>();
    const ids = new Set<string>();
    for (const b of snapshot.blocks) {
      if (b.blockerId === currentStudent.id) ids.add(b.blockedStudentId);
      if (b.blockedStudentId === currentStudent.id) ids.add(b.blockerId);
    }
    return ids;
  }, [snapshot, currentStudent]);

  const myMatches = useMemo(() => {
    if (!snapshot || !currentStudent) return [];
    return snapshot.matches.filter(
      (m) =>
        (m.studentAId === currentStudent.id || m.studentBId === currentStudent.id) &&
        !blockedUserIds.has(m.studentAId === currentStudent.id ? m.studentBId : m.studentAId)
    );
  }, [snapshot, currentStudent, blockedUserIds]);

  const { compatibleFeed, excludedFeed } = useMemo(() => {
    if (!snapshot || !currentStudent || !anchorRequest) {
      return {
        compatibleFeed: [] as Array<{
          request: ActivityRequest;
          author: StudentProfile;
          evaluation: CompatibilityEvaluation;
        }>,
        excludedFeed: [] as Array<{
          request: ActivityRequest;
          author: StudentProfile;
          evaluation: CompatibilityEvaluation;
        }>,
      };
    }

    const compatible: Array<{
      request: ActivityRequest;
      author: StudentProfile;
      evaluation: CompatibilityEvaluation;
    }> = [];
    const excluded: Array<{
      request: ActivityRequest;
      author: StudentProfile;
      evaluation: CompatibilityEvaluation;
    }> = [];

    for (const req of snapshot.requests) {
      if (req.authorId === currentStudent.id) continue;
      if (req.status === 'cancelled') continue;
      if (blockedUserIds.has(req.authorId)) continue;

      const author = snapshot.students.find((s) => s.id === req.authorId);
      if (!author) continue;

      const evaluation = evaluateCompatibility(anchorRequest, req);
      if (evaluation.compatible) {
        compatible.push({ request: req, author, evaluation });
      } else {
        excluded.push({ request: req, author, evaluation });
      }
    }

    compatible.sort((a, b) => b.evaluation.sharedSlots.length - a.evaluation.sharedSlots.length);
    return { compatibleFeed: compatible, excludedFeed: excluded };
  }, [snapshot, currentStudent, anchorRequest, blockedUserIds]);

  const storageBytes = useMemo(() => getStorageByteSize(), [snapshot]);

  // Designed 404 View (distinctive-visual-style craft rule #11)
  if (pathname !== '/' && pathname !== '/index.html') {
    return (
      <div className="board-shell" style={{ paddingTop: 'var(--space-8)' }}>
        <div className="perforated-slip" style={{ maxWidth: 620, margin: '0 auto' }}>
          <div className="slip-upper">
            <span className="mono-label">404 · Unpinned Campus Route</span>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xl)',
                fontWeight: 400,
                margin: '10px 0 8px',
              }}
            >
              No activity slip is pinned at <code>{pathname}</code>.
            </h1>
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              This board serves Faculté des Sciences de Monastir from the main campus index.
            </p>
          </div>
          <hr className="slip-perforation" />
          <div className="slip-lower">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                window.history.pushState({}, '', '/');
                setPathname('/');
              }}
            >
              Return to FSM Activity Board
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Action Handlers with double-submit guard + human error surface
  const handleSwitchPersona = async (studentId: string) => {
    setActionError(null);
    try {
      const next = await withTimeout(switchActiveStudent(studentId));
      setSnapshot(next);
      const nextName = next.students.find((s) => s.id === studentId)?.fullName;
      if (nextName) showToast(`Switched active FSM student to ${nextName}`);
    } catch (err) {
      setActionError(toAppError(err));
    }
  };

  const handleCreateRequest = async (input: CreateRequestInput) => {
    const { db, created } = await withTimeout(createActivityRequest(input));
    setSnapshot(db);
    setSelectedAnchorId(created.id);
    setActiveTab('compatible');
    showToast('Activity slip pinned to the FSM board');
  };

  const handleOptInPeerRequest = async (myReqId: string, peerReqId: string) => {
    if (busyId) return;
    setBusyId(peerReqId);
    setActionError(null);
    try {
      const next = await withTimeout(optInCompatibleRequest(myReqId, peerReqId));
      setSnapshot(next);
      const createdMatch = next.matches.find(
        (m) =>
          m.status !== 'cancelled' &&
          ((m.requestAId === myReqId && m.requestBId === peerReqId) ||
            (m.requestAId === peerReqId && m.requestBId === myReqId))
      );
      setActiveTab('matches');
      showToast(
        createdMatch?.status === 'arranging_details'
          ? 'Mutual match unlocked! Confirm your public FSM venue and time.'
          : 'Opt-in recorded. Switch persona in the left rail to accept from your peer’s side.'
      );
    } catch (err) {
      setActionError(toAppError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleProposeLogistics = async (
    matchId: string,
    slot: TimeSlotId,
    venue: FsmVenueId
  ) => {
    if (busyId) return;
    setBusyId(matchId);
    setActionError(null);
    try {
      const next = await withTimeout(proposeMatchLogistics(matchId, slot, venue));
      setSnapshot(next);
      showToast('Public FSM venue & slot proposed — awaiting partner confirmation.');
    } catch (err) {
      setActionError(toAppError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmLogistics = async (matchId: string) => {
    if (busyId) return;
    setBusyId(matchId);
    setActionError(null);
    try {
      const next = await withTimeout(confirmMatchLogistics(matchId));
      setSnapshot(next);
      showToast('Public campus meetup confirmed by both students!');
    } catch (err) {
      setActionError(toAppError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleCheckIn = async (matchId: string, outcome: 'met' | 'did_not_meet') => {
    if (busyId) return;
    setBusyId(matchId);
    setActionError(null);
    try {
      const next = await withTimeout(submitMeetCheckIn(matchId, outcome));
      setSnapshot(next);
      showToast('Campus check-in stamped on your match slip.');
    } catch (err) {
      setActionError(toAppError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelMatch = async (matchId: string) => {
    if (busyId) return;
    setBusyId(matchId);
    setActionError(null);
    try {
      const next = await withTimeout(withdrawOrCancelMatch(matchId));
      setSnapshot(next);
      showToast('Match slip withdrawn cleanly.');
    } catch (err) {
      setActionError(toAppError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleWithdrawMyRequest = async (reqId: string) => {
    if (busyId) return;
    setBusyId(reqId);
    setActionError(null);
    try {
      const next = await withTimeout(withdrawActivityRequest(reqId));
      setSnapshot(next);
      showToast('Activity slip removed from the active board.');
    } catch (err) {
      setActionError(toAppError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleSafetyAction = async (alsoBlock: boolean) => {
    if (!safetyTarget || busyId) return;
    setBusyId(safetyTarget.student.id);
    setActionError(null);
    try {
      const next = await withTimeout(
        reportAndOptionallyBlock({
          targetStudentId: safetyTarget.student.id,
          requestId: safetyTarget.requestId,
          reason: safetyReason,
          note: safetyNotes || 'Submitted via FSM safety control',
          alsoBlock,
        })
      );
      const targetName = safetyTarget.student.fullName;
      setSafetyTarget(null);
      setSafetyNotes('');
      setSnapshot(next);
      showToast(
        alsoBlock
          ? `${targetName} blocked and private safety report logged.`
          : 'Private safety report recorded.'
      );
    } catch (err) {
      setActionError(toAppError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleFault = (enabled: boolean) => {
    setFaultSimulation(enabled);
    setFaultEnabledState(enabled);
    if (!enabled) {
      setLoadError(null);
      setActionError(null);
      refreshBoard(false);
      showToast('Storage fault simulator disabled — board recovered.');
    } else {
      showToast('Storage fault simulator armed — next DB read/write will trigger ErrorState.');
    }
  };

  const handleResetSeed = async () => {
    setFaultSimulation(false);
    setFaultEnabledState(false);
    setLoadError(null);
    setActionError(null);
    const fresh = await withTimeout(resetDemoDatabase());
    setSnapshot(fresh);
    showToast('FSM mock dataset restored to clean initial seed.');
  };

  const activeMatchesCount = myMatches.filter((m) => m.status !== 'cancelled').length;
  const pendingActionCount = myMatches.filter(
    (m) =>
      (m.status === 'pending_mutual' &&
        ((m.studentAId === currentStudent?.id && !m.studentAOptIn) ||
          (m.studentBId === currentStudent?.id && !m.studentBOptIn))) ||
      (m.status === 'arranging_details' &&
        currentStudent &&
        !m.confirmedByIds.includes(currentStudent.id))
  ).length;

  return (
    <div className="board-shell">
      {/* Offline / Connectivity Banner */}
      {isOffline && (
        <div
          role="status"
          style={{
            padding: '10px 14px',
            background: 'var(--warning-bg)',
            borderBottom: '1px solid var(--warning)',
            color: 'var(--warning)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
          }}
        >
          Offline mode — changes continue to persist locally in browser storage (
          <code>{STORAGE_KEY}</code>).
        </div>
      )}

      {/* Top Masthead */}
      <header className="masthead">
        <a href="/" className="brand-lockup">
          <span className="brand-mark">
            W.I.N.K<span className="brand-stamp" aria-hidden="true" />
          </span>
          <span className="mono-label">
            Faculté des Sciences de Monastir · Activity Board
          </span>
        </a>

        <div className="masthead-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setTourTrigger((n) => n + 1)}
          >
            <IconCompass size={15} />
            <span>Replay tour</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Asymmetric Editorial Intro Band */}
      <section className="editorial-header" aria-label="Campus board introduction">
        <div>
          <div className="mono-label">
            Pilot Scope · FSM Monastir Only · Purpose Before Profile
          </div>
          <h1 className="display-headline">
            Purpose-matched campus meetups, without social noise.
          </h1>
        </div>
        <div>
          <p className="editorial-lede">
            Need a 10th player for 5v5 football, a past-paper partner at the library, or a 30-minute
            coffee between lectures? W.I.N.K blocks mismatched intentions and confirms a public FSM
            venue only when both students opt in.
          </p>
        </div>
      </section>

      {/* Main 12-Col Asymmetric Workspace */}
      <div className="asymmetric-grid">
        {/* LEFT RAIL: Student Persona, Anchor Slip & Safety Charter */}
        <aside className="left-rail" aria-label="Active student controls">
          <div className="rail-section" data-tour="persona-switcher">
            <div
              className="mono-label"
              style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <IconUserSwitch size={13} /> Active FSM Student (Demo Switcher)
            </div>
            {snapshot && currentStudent ? (
              <>
                <label
                  className="field-label"
                  htmlFor="persona-select"
                  style={{ display: 'block', marginBottom: 6 }}
                >
                  Viewing &amp; acting as
                </label>
                <select
                  id="persona-select"
                  className="select-control"
                  value={currentStudent.id}
                  onChange={(e) => handleSwitchPersona(e.target.value)}
                >
                  {snapshot.students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName} — {st.department}
                    </option>
                  ))}
                </select>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 'var(--text-sm)',
                    color: 'var(--muted)',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--fg)' }}>{currentStudent.fsmVerifiedNote}</strong>
                  </div>
                  <div style={{ marginTop: 4 }} className="num">
                    {currentStudent.reliabilityNote}
                  </div>
                </div>
              </>
            ) : (
              <div className="skeleton-block" style={{ height: 76 }} />
            )}
          </div>

          <div className="rail-section">
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              data-tour="post-request-btn"
              onClick={() => setCreateModalOpen(true)}
            >
              <IconPlus size={17} />
              <span>Pin new activity slip</span>
            </button>

            {myOpenRequests.length > 0 && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <label
                  htmlFor="anchor-request-select"
                  className="mono-label"
                  style={{ display: 'block', marginBottom: 6 }}
                >
                  Matching Against Your Slip ({myOpenRequests.length})
                </label>
                <select
                  id="anchor-request-select"
                  className="select-control"
                  value={anchorRequest?.id || ''}
                  onChange={(e) => setSelectedAnchorId(e.target.value)}
                >
                  {myOpenRequests.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
                {anchorRequest && (
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--muted)',
                    }}
                  >
                    Intent:{' '}
                    <strong style={{ color: 'var(--fg)' }}>
                      {PURPOSE_LABELS[anchorRequest.purpose]}
                    </strong>{' '}
                    · {ROLE_LABELS[anchorRequest.roleMode]}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rail-section">
            <div
              className="mono-label"
              style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <IconShield size={13} /> Non-Negotiable MVP Rules
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 'var(--text-sm)',
                color: 'var(--muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <li>Public FSM campus venues only (stade, cafétéria, bibliothèque, halls).</li>
              <li>Mutual opt-in before any venue/slot confirmation.</li>
              <li>Structured logistics — zero unsolicited open-DM noise.</li>
              <li>No public star ratings or popularity leaderboards.</li>
            </ul>
          </div>
        </aside>

        {/* MAIN COLUMN */}
        <main aria-live="polite">
          {/* Navigation Tabs */}
          <div
            className="board-tabs"
            role="tablist"
            aria-label="Board sections"
            data-tour="board-tabs"
          >
            <button
              type="button"
              role="tab"
              className="tab-btn"
              aria-selected={activeTab === 'compatible'}
              onClick={() => setActiveTab('compatible')}
            >
              <span>Compatible Slips</span>
              <span className="tab-count num">{compatibleFeed.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              className="tab-btn"
              aria-selected={activeTab === 'matches'}
              onClick={() => setActiveTab('matches')}
            >
              <span>
                Mutual Match Slips{pendingActionCount > 0 ? ` (${pendingActionCount} action)` : ''}
              </span>
              <span className="tab-count num">{activeMatchesCount}</span>
            </button>

            <button
              type="button"
              role="tab"
              className="tab-btn"
              aria-selected={activeTab === 'mine'}
              onClick={() => setActiveTab('mine')}
            >
              <span>My Posted Slips</span>
              <span className="tab-count num">{myOpenRequests.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              className="tab-btn"
              aria-selected={activeTab === 'db'}
              data-tour="db-inspector-tab"
              onClick={() => setActiveTab('db')}
            >
              <IconDatabase size={15} />
              <span>LocalStorage DB &amp; Code</span>
            </button>
          </div>

          {/* Non-blocking Action Error Banner */}
          {actionError && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <ErrorState
                error={actionError}
                faultActive={faultEnabled}
                onRetry={() => {
                  setActionError(null);
                  refreshBoard(false);
                }}
                onClearFault={() => handleToggleFault(false)}
              />
            </div>
          )}

          {/* Primary Load States */}
          {loading ? (
            <BoardSkeletonList count={3} />
          ) : loadError || !snapshot ? (
            <ErrorState
              error={
                loadError || {
                  title: 'Board unavailable',
                  message: 'Could not read campus slips from browser storage.',
                  retryable: true,
                  errorId: 'INIT01',
                }
              }
              faultActive={faultEnabled}
              onRetry={() => refreshBoard(true)}
              onClearFault={() => handleToggleFault(false)}
            />
          ) : (
            <>
              {/* TAB 1: COMPATIBLE CAMPUS SLIPS */}
              {activeTab === 'compatible' && (
                <section aria-label="Compatible FSM activity slips">
                  {!anchorRequest ? (
                    <EmptyState
                      eyebrow="No Active Anchor Slip"
                      title="Pin what you want to do on campus first"
                      description="W.I.N.K never shows an unfocused feed. Pin an activity slip so we can match you strictly with FSM peers who share your exact purpose and schedule."
                      actionLabel="Pin new activity slip"
                      onAction={() => setCreateModalOpen(true)}
                    />
                  ) : compatibleFeed.length === 0 ? (
                    <EmptyState
                      eyebrow="Zero Compatible Peers Right Now"
                      title={`No open peer slips match "${anchorRequest.title}" yet`}
                      description={`${excludedFeed.length} other campus requests are currently hidden because their activity, purpose, role, or slot does not align with yours. Pin another slot or inspect why incompatible slips were filtered out below.`}
                      actionLabel="Pin another time or activity"
                      onAction={() => setCreateModalOpen(true)}
                    />
                  ) : (
                    <div className="slip-list">
                      {compatibleFeed.map(({ request, author, evaluation }) => {
                        const venue = FSM_VENUES[request.preferredVenue];
                        const existingMatch = myMatches.find(
                          (m) =>
                            m.status !== 'cancelled' &&
                            ((m.requestAId === anchorRequest.id &&
                              m.requestBId === request.id) ||
                              (m.requestBId === anchorRequest.id &&
                                m.requestAId === request.id))
                        );

                        return (
                          <article key={request.id} className="request-row">
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: 8,
                                  alignItems: 'center',
                                  marginBottom: 8,
                                }}
                              >
                                <span className="status-pill is-confirmed num">
                                  5/5 Intent Axes Aligned
                                </span>
                                <span className="mono-label">
                                  {ACTIVITY_META[request.activity].shortCode} ·{' '}
                                  {ACTIVITY_META[request.activity].label}
                                </span>
                              </div>

                              <h3
                                style={{
                                  fontFamily: 'var(--font-display)',
                                  fontSize: 'var(--text-lg)',
                                  fontWeight: 500,
                                  margin: '0 0 6px',
                                }}
                              >
                                {request.title}
                              </h3>

                              <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>
                                {request.contextNote}
                              </p>

                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: 'var(--space-4)',
                                  fontSize: 'var(--text-sm)',
                                  color: 'var(--muted)',
                                }}
                              >
                                <span>
                                  <strong style={{ color: 'var(--fg)' }}>{author.fullName}</strong>{' '}
                                  · {author.department}
                                </span>
                                <span
                                  className="num"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                >
                                  <IconClock size={15} />
                                  Shared:{' '}
                                  {evaluation.sharedSlots
                                    .map((s) => TIME_SLOTS[s].label)
                                    .join(' · ')}
                                </span>
                                <span
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                >
                                  <IconMapPin size={15} />
                                  {venue.name}
                                </span>
                              </div>

                              {/* 5-Axis Alignment Proof */}
                              <div className="axis-grid">
                                <div className="axis-cell">
                                  <div className="mono-label">Role Fit</div>
                                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                                    {request.roleDetail}
                                  </div>
                                </div>
                                <div className="axis-cell">
                                  <div className="mono-label">Shared Purpose</div>
                                  <div style={{ fontSize: 'var(--text-sm)' }}>
                                    {PURPOSE_LABELS[request.purpose]}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Column */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-2)',
                              }}
                            >
                              {existingMatch ? (
                                <button
                                  type="button"
                                  className="btn"
                                  onClick={() => setActiveTab('matches')}
                                >
                                  <IconCheck size={16} />
                                  <span>
                                    Open match slip ({existingMatch.status.replace('_', ' ')})
                                  </span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  disabled={busyId === request.id}
                                  onClick={() =>
                                    handleOptInPeerRequest(anchorRequest.id, request.id)
                                  }
                                >
                                  <IconCheck size={16} />
                                  <span>
                                    {busyId === request.id
                                      ? 'Recording opt-in…'
                                      : 'Opt in to meet'}
                                  </span>
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() =>
                                  setSafetyTarget({ student: author, requestId: request.id })
                                }
                              >
                                <IconShield size={14} />
                                <span>Report or block</span>
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {/* Transparency Drawer: Excluded Mismatched Intents */}
                  {anchorRequest && excludedFeed.length > 0 && (
                    <div
                      style={{
                        marginTop: 'var(--space-6)',
                        paddingTop: 'var(--space-4)',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-sm"
                        aria-expanded={showFilteredWhy}
                        onClick={() => setShowFilteredWhy((v) => !v)}
                      >
                        <span>
                          {showFilteredWhy ? 'Hide' : 'Inspect'} {excludedFeed.length} campus slips
                          automatically excluded for mismatched purpose/time
                        </span>
                      </button>

                      {showFilteredWhy && (
                        <div className="data-table-wrap" style={{ marginTop: 'var(--space-3)' }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Student</th>
                                <th>Slip Title</th>
                                <th>Their Purpose</th>
                                <th>Why Filtered Out</th>
                              </tr>
                            </thead>
                            <tbody>
                              {excludedFeed.map(({ request, author, evaluation }) => (
                                <tr key={request.id}>
                                  <td>
                                    <strong>{author.fullName}</strong> ({author.department})
                                  </td>
                                  <td>{request.title}</td>
                                  <td>{PURPOSE_LABELS[request.purpose]}</td>
                                  <td style={{ color: 'var(--muted)' }}>
                                    {evaluation.headlineReason}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* TAB 2: SIGNATURE PERFORATED MUTUAL MATCH SLIPS */}
              {activeTab === 'matches' && (
                <section aria-label="Mutual match slips">
                  {myMatches.length === 0 ? (
                    <EmptyState
                      eyebrow="No Match Slips Yet"
                      title="Opt in to a compatible campus slip to start"
                      description="Once both FSM students opt in, your perforated confirmation slip unlocks public campus venue and time confirmation."
                      actionLabel="Browse compatible slips"
                      onAction={() => setActiveTab('compatible')}
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-5)',
                      }}
                    >
                      {myMatches.map((m) => {
                        const partnerId =
                          m.studentAId === currentStudent?.id ? m.studentBId : m.studentAId;
                        const partner = snapshot.students.find((s) => s.id === partnerId);
                        const reqA = snapshot.requests.find((r) => r.id === m.requestAId);
                        const reqB = snapshot.requests.find((r) => r.id === m.requestBId);

                        return (
                          <MutualMatchSlip
                            key={m.id}
                            match={m}
                            currentUserId={currentStudent?.id || ''}
                            requestA={reqA}
                            requestB={reqB}
                            partner={partner}
                            busyId={busyId}
                            onAcceptMatch={handleOptInPeerRequest}
                            onProposeLogistics={handleProposeLogistics}
                            onConfirmLogistics={handleConfirmLogistics}
                            onCheckIn={handleCheckIn}
                            onCancelMatch={handleCancelMatch}
                            onOpenSafety={(student, requestId) =>
                              setSafetyTarget({ student, requestId })
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* TAB 3: MY POSTED SLIPS */}
              {activeTab === 'mine' && (
                <section aria-label="My posted activity slips">
                  {myOpenRequests.length === 0 ? (
                    <EmptyState
                      eyebrow="Nothing Pinned"
                      title="You have no active slips on the FSM board"
                      description="Pin a structured slip to find a compatible 5v5 player, coffee break peer, past-paper partner, or lab teammate."
                      actionLabel="Pin new activity slip"
                      onAction={() => setCreateModalOpen(true)}
                    />
                  ) : (
                    <div className="slip-list">
                      {myOpenRequests.map((req) => {
                        const venue = FSM_VENUES[req.preferredVenue];
                        return (
                          <article key={req.id} className="request-row">
                            <div>
                              <div className="mono-label" style={{ marginBottom: 6 }}>
                                {ACTIVITY_META[req.activity].shortCode} ·{' '}
                                {ACTIVITY_META[req.activity].label} · {PURPOSE_LABELS[req.purpose]}
                              </div>
                              <h3
                                style={{
                                  fontFamily: 'var(--font-display)',
                                  fontSize: 'var(--text-lg)',
                                  fontWeight: 500,
                                  margin: '0 0 6px',
                                }}
                              >
                                {req.title}
                              </h3>
                              <p style={{ margin: '0 0 10px', color: 'var(--muted)' }}>
                                {req.contextNote}
                              </p>
                              <div
                                className="num"
                                style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}
                              >
                                {req.availableSlots.map((s) => TIME_SLOTS[s].label).join(' · ')} ·{' '}
                                {venue.name} · {req.roleDetail}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => {
                                  setSelectedAnchorId(req.id);
                                  setActiveTab('compatible');
                                }}
                              >
                                View compatible peers
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                disabled={busyId === req.id}
                                onClick={() => handleWithdrawMyRequest(req.id)}
                              >
                                {busyId === req.id ? 'Removing…' : 'Withdraw slip'}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* TAB 4: LOCALSTORAGE DB EXAMPLE CODE & LIVE INSPECTOR */}
              {activeTab === 'db' && (
                <LocalStorageInspector
                  snapshot={snapshot}
                  storageBytes={storageBytes}
                  faultEnabled={faultEnabled}
                  onToggleFault={handleToggleFault}
                  onResetSeed={handleResetSeed}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Create Activity Slip Modal */}
      <CreateRequestModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateRequest}
      />

      {/* Structured Campus Safety Modal (Block / Report) */}
      {safetyTarget && (
        <div className="modal-backdrop" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="safety-modal-title"
            className="modal-panel"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono-label">FSM Campus Safety Control</span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setSafetyTarget(null)}
              >
                <IconX size={15} />
                <span>Close</span>
              </button>
            </div>
            <h2
              id="safety-modal-title"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xl)',
                fontWeight: 400,
                margin: '10px 0 8px',
              }}
            >
              Report or block {safetyTarget.student.fullName}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
              Blocking immediately hides both students from each other and cancels any uncompleted
              match slips. Reports stay private (never public ratings).
            </p>

            <div className="field-group" style={{ marginBottom: 'var(--space-3)' }}>
              <label className="field-label" htmlFor="safety-reason">
                Reason
              </label>
              <select
                id="safety-reason"
                className="select-control"
                value={safetyReason}
                onChange={(e) => setSafetyReason(e.target.value as SafetyReport['reason'])}
              >
                <option value="mismatched_intent">Ignored stated activity purpose</option>
                <option value="no_show">Did not show up to confirmed campus venue</option>
                <option value="unsafe_venue_push">Suggested non-public / off-campus spot</option>
                <option value="inappropriate_conduct">Uncomfortable or inappropriate conduct</option>
              </select>
            </div>

            <div className="field-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="field-label" htmlFor="safety-notes">
                Context for moderators (optional)
              </label>
              <textarea
                id="safety-notes"
                className="textarea-control"
                value={safetyNotes}
                onChange={(e) => setSafetyNotes(e.target.value)}
                placeholder="Brief factual note…"
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn"
                disabled={busyId === safetyTarget.student.id}
                onClick={() => handleSafetyAction(false)}
              >
                Submit private report only
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={busyId === safetyTarget.student.id}
                onClick={() => handleSafetyAction(true)}
              >
                Block student &amp; report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guided Onboarding Tour */}
      <OnboardingTour externalTrigger={tourTrigger} />

      {/* Non-blocking Confirmation Toast */}
      {toastMessage && (
        <div className="toast-region" role="status" aria-live="polite">
          <div className="toast-card">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              aria-label="Dismiss notification"
              style={{
                background: 'transparent',
                border: 0,
                color: 'inherit',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <IconX size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
