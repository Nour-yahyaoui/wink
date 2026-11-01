import React, { useEffect, useRef, useState } from 'react';
import type { CreateRequestInput } from '@db/localStorageDb';
import {
  ACTIVITY_META,
  FSM_VENUES,
  PURPOSE_LABELS,
  ROLE_LABELS,
  TIME_SLOTS,
} from '@db/mockData';
import type {
  ActivityCategory,
  FsmVenueId,
  IntentPurpose,
  RoleMode,
  TimeSlotId,
} from '@db/types';
import { toAppError, type AppError } from '../lib/errors';
import { IconPlus, IconX } from './Icons';

interface CreateRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateRequestInput) => Promise<void>;
}

export function CreateRequestModal({ open, onClose, onSubmit }: CreateRequestModalProps) {
  const [activity, setActivity] = useState<ActivityCategory>('exam_prep');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState<IntentPurpose>('solve_past_exam_papers');
  const [roleMode, setRoleMode] = useState<RoleMode>('co_participant');
  const [roleDetail, setRoleDetail] = useState('1-to-1 focused past-paper partner');
  const [availableSlots, setAvailableSlots] = useState<TimeSlotId[]>(['tomorrow_14_00']);
  const [preferredVenue, setPreferredVenue] = useState<FsmVenueId>('fsm_bibliotheque');
  const [contextNote, setContextNote] = useState('');

  const [titleError, setTitleError] = useState<string | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<AppError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleActivityChange = (next: ActivityCategory) => {
    setActivity(next);
    const meta = ACTIVITY_META[next];
    if (!meta.allowedPurposes.includes(purpose)) {
      setPurpose(meta.allowedPurposes[0]);
    }
    setPreferredVenue(meta.defaultVenue);
    if (next === 'football_5v5') {
      setRoleMode('need_player');
      setRoleDetail('Need 1 player to complete 5v5 game');
    } else {
      setRoleMode('co_participant');
      setRoleDetail('1-to-1 equal co-participant');
    }
  };

  const toggleSlot = (slot: TimeSlotId) => {
    setSlotsError(null);
    setAvailableSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    let valid = true;
    if (title.trim().length < 6) {
      setTitleError('Enter a specific activity or course title (at least 6 characters).');
      valid = false;
    } else {
      setTitleError(null);
    }

    if (availableSlots.length === 0) {
      setSlotsError('Select at least one campus time window.');
      valid = false;
    } else {
      setSlotsError(null);
    }

    if (!valid) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        title,
        activity,
        purpose,
        roleMode,
        roleDetail,
        availableSlots,
        preferredVenue,
        contextNote,
      });
      // Reset fields only on clean success — preserve user input on error!
      setTitle('');
      setContextNote('');
      onClose();
    } catch (err) {
      setSubmitError(toAppError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-slip-title"
        className="modal-panel"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-3)',
          }}
        >
          <span className="mono-label">New FSM Activity Slip</span>
          <button
            type="button"
            className="btn btn-sm"
            disabled={submitting}
            onClick={onClose}
            aria-label="Close modal"
          >
            <IconX size={16} />
            <span>Close</span>
          </button>
        </div>

        <h2
          id="create-slip-title"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 400,
            margin: '0 0 6px',
          }}
        >
          Pin a structured request
        </h2>
        <p style={{ margin: '0 0 18px', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
          Only FSM peers with matching activity, purpose, complementary role, and overlapping
          campus availability will see this slip as compatible.
        </p>

        {submitError && (
          <div
            role="alert"
            style={{
              padding: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              border: '1px solid var(--danger)',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <strong>{submitError.title}:</strong> {submitError.message} (Ref {submitError.errorId})
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="field-group">
              <label className="field-label" htmlFor="req-title">
                Specific Activity, Game, or Course Title
              </label>
              <input
                id="req-title"
                type="text"
                className="input-control"
                placeholder="e.g. Missing 1 keeper for 5v5 Football, or Solve Automata 2025 paper"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError(null);
                }}
                aria-invalid={Boolean(titleError)}
                aria-describedby={titleError ? 'req-title-err' : undefined}
              />
              {titleError && (
                <p id="req-title-err" className="field-error">
                  {titleError}
                </p>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              <div className="field-group">
                <label className="field-label" htmlFor="req-activity">
                  Activity Category
                </label>
                <select
                  id="req-activity"
                  className="select-control"
                  value={activity}
                  onChange={(e) => handleActivityChange(e.target.value as ActivityCategory)}
                >
                  {(Object.keys(ACTIVITY_META) as ActivityCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {ACTIVITY_META[cat].label} ({ACTIVITY_META[cat].shortCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="req-purpose">
                  Exact Purpose (Intent Filter)
                </label>
                <select
                  id="req-purpose"
                  className="select-control"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as IntentPurpose)}
                >
                  {(Object.keys(PURPOSE_LABELS) as IntentPurpose[]).map((p) => (
                    <option key={p} value={p}>
                      {PURPOSE_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              <div className="field-group">
                <label className="field-label" htmlFor="req-role">
                  Role Mode
                </label>
                <select
                  id="req-role"
                  className="select-control"
                  value={roleMode}
                  onChange={(e) => setRoleMode(e.target.value as RoleMode)}
                >
                  {(Object.keys(ROLE_LABELS) as RoleMode[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="req-role-detail">
                  Role Note
                </label>
                <input
                  id="req-role-detail"
                  type="text"
                  className="input-control"
                  value={roleDetail}
                  onChange={(e) => setRoleDetail(e.target.value)}
                />
              </div>
            </div>

            <div className="field-group">
              <span className="field-label">Available Campus Time Windows (select 1 or more)</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(Object.keys(TIME_SLOTS) as TimeSlotId[]).map((sid) => {
                  const active = availableSlots.includes(sid);
                  return (
                    <button
                      key={sid}
                      type="button"
                      className={active ? 'btn btn-primary btn-sm num' : 'btn btn-sm num'}
                      aria-pressed={active}
                      onClick={() => toggleSlot(sid)}
                    >
                      {TIME_SLOTS[sid].label}
                    </button>
                  );
                })}
              </div>
              {slotsError && <p className="field-error">{slotsError}</p>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="req-venue">
                Preferred Public FSM Meeting Point
              </label>
              <select
                id="req-venue"
                className="select-control"
                value={preferredVenue}
                onChange={(e) => setPreferredVenue(e.target.value as FsmVenueId)}
              >
                {(Object.keys(FSM_VENUES) as FsmVenueId[]).map((vid) => (
                  <option key={vid} value={vid}>
                    {FSM_VENUES[vid].name} — {FSM_VENUES[vid].zone}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="req-context">
                Structured Logistics Note (optional)
              </label>
              <textarea
                id="req-context"
                className="textarea-control"
                placeholder="e.g. Bring turf shoes / printed TD sheet — meet by main entrance."
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 'var(--space-2)',
                paddingTop: 'var(--space-2)',
                borderTop: '1px solid var(--border)',
              }}
            >
              <button type="button" className="btn" disabled={submitting} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <IconPlus size={16} />
                <span>{submitting ? 'Pinning slip…' : 'Pin activity slip'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
