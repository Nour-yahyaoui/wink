import { useEffect, useRef, useState } from 'react';
import { IconCompass, IconX } from './Icons';

export const ONBOARD_STORAGE_KEY = 'onboard:v1:done';

interface TourStep {
  selector: string;
  title: string;
  body: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="persona-switcher"]',
    title: '1. Switch FSM Student Persona',
    body: 'Test both sides of every mutual opt-in and venue confirmation by switching between Amira, Yassine, Salma, Karim, Nourhene, and Mehdi.',
  },
  {
    selector: '[data-tour="post-request-btn"]',
    title: '2. Post a Structured Activity Slip',
    body: 'Every slip captures Activity, Purpose, Role, Time Window, and approved public FSM venue — never open-ended bios or swiping.',
  },
  {
    selector: '[data-tour="board-tabs"]',
    title: '3. Compatible Slips & Perforated Match Stubs',
    body: 'Non-matching intents (for example networking vs exam cramming) are automatically filtered out. Mutual opt-ins create a two-part confirmation slip.',
  },
  {
    selector: '[data-tour="db-inspector-tab"]',
    title: '4. Live LocalStorage DB & Code Example',
    body: 'Inspect raw JSON in wink_fsm_demo_db_v1, copy the TypeScript adapter code, reset mock data, or trigger fault simulation to test error recovery.',
  },
];

export function OnboardingTour({
  externalTrigger,
  onTourClosed,
}: {
  externalTrigger: number;
  onTourClosed?: () => void;
}) {
  const [stage, setStage] = useState<'closed' | 'welcome' | 'steps'>(() => {
    try {
      return window.localStorage.getItem(ONBOARD_STORAGE_KEY) === '1' ? 'closed' : 'welcome';
    } catch {
      return 'closed';
    }
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (externalTrigger > 0) {
      setStepIndex(0);
      setStage('welcome');
    }
  }, [externalTrigger]);

  const finishTour = () => {
    try {
      window.localStorage.setItem(ONBOARD_STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setStage('closed');
    onTourClosed?.();
  };

  useEffect(() => {
    if (stage === 'closed') return;
    dialogRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finishTour();
      } else if (stage === 'steps' && e.key === 'ArrowRight') {
        if (stepIndex < TOUR_STEPS.length - 1) setStepIndex((i) => i + 1);
        else finishTour();
      } else if (stage === 'steps' && e.key === 'ArrowLeft' && stepIndex > 0) {
        setStepIndex((i) => i - 1);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [stage, stepIndex]);

  useEffect(() => {
    if (stage !== 'steps') {
      setTargetRect(null);
      return;
    }

    const step = TOUR_STEPS[stepIndex];
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      return;
    }

    el.scrollIntoView({ behavior: 'auto', block: 'center' });
    const updateRect = () => setTargetRect(el.getBoundingClientRect());
    updateRect();

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [stage, stepIndex]);

  if (stage === 'closed') return null;

  if (stage === 'welcome') {
    return (
      <div className="modal-backdrop" role="presentation">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-tour-title"
          className="modal-panel"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mono-label">FSM Campus Pilot · Interactive Demo</span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={finishTour}
              aria-label="Skip welcome tour"
            >
              <IconX size={16} />
              <span>Skip</span>
            </button>
          </div>

          <h2
            id="welcome-tour-title"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              fontWeight: 400,
              margin: '12px 0 10px',
              lineHeight: 1.15,
            }}
          >
            Find the right campus partner for a real activity — without chat noise.
          </h2>

          <p style={{ margin: '0 0 18px', color: 'var(--muted)' }}>
            W.I.N.K pairs students at <strong>Faculté des Sciences de Monastir</strong> strictly on
            shared activity, purpose, role, and time window, then confirms a public campus meeting
            point. Everything in this demo runs against a persistent{' '}
            <code>localStorage</code> database adapter you can inspect live.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 'var(--space-2)',
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid var(--border)',
            }}
          >
            <button type="button" className="btn" onClick={finishTour}>
              Explore on my own
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setStepIndex(0);
                setStage('steps');
              }}
            >
              <IconCompass size={16} />
              <span>Take 4-step tour (30 sec)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentStep = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  // Position coach card safely inside viewport
  const cardTop = targetRect
    ? Math.min(window.innerHeight - 250, Math.max(16, targetRect.bottom + 14))
    : 80;
  const cardLeft = targetRect
    ? Math.min(Math.max(16, targetRect.left), Math.max(16, window.innerWidth - 380))
    : 24;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none' }}>
      {/* Spotlight highlight frame */}
      {targetRect && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: 'var(--radius)',
            border: '2px solid var(--primary)',
            boxShadow: '0 0 0 9999px rgba(20, 19, 17, 0.55)',
            transition: 'all var(--dur-base) var(--ease-out)',
          }}
        />
      )}

      {/* Coach mark dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="false"
        aria-labelledby="coach-step-title"
        style={{
          pointerEvents: 'auto',
          position: 'fixed',
          top: cardTop,
          left: cardLeft,
          width: 'min(356px, calc(100vw - 32px))',
          background: 'var(--card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-float)',
          padding: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="mono-label">
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </span>
          <button type="button" className="btn btn-sm" onClick={finishTour}>
            Skip
          </button>
        </div>

        <h3
          id="coach-step-title"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 500,
            margin: '8px 0 6px',
          }}
        >
          {currentStep.title}
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
          {currentStep.body}
        </p>

        {/* Progress dots + controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
            {TOUR_STEPS.map((_, idx) => (
              <span
                key={idx}
                style={{
                  width: idx === stepIndex ? 18 : 7,
                  height: 7,
                  borderRadius: 4,
                  background: idx === stepIndex ? 'var(--primary)' : 'var(--border-strong)',
                  transition: 'width var(--dur-fast) var(--ease-out)',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {stepIndex > 0 && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setStepIndex((i) => i - 1)}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (isLast) finishTour();
                else setStepIndex((i) => i + 1);
              }}
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
