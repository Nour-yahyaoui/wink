import { useState } from 'react';
import {
  ACTIVITY_META,
  FSM_VENUES,
  PURPOSE_LABELS,
  ROLE_LABELS,
  TIME_SLOTS,
} from '@db/mockData';
import type {
  ActivityRequest,
  FsmVenueId,
  MutualMatchRecord,
  StudentProfile,
  TimeSlotId,
} from '@db/types';
import { IconCheck, IconClock, IconMapPin, IconShield, IconX } from './Icons';

interface MutualMatchSlipProps {
  match: MutualMatchRecord;
  currentUserId: string;
  requestA?: ActivityRequest;
  requestB?: ActivityRequest;
  partner?: StudentProfile;
  busyId: string | null;
  onAcceptMatch: (myReqId: string, peerReqId: string) => void;
  onProposeLogistics: (matchId: string, slot: TimeSlotId, venue: FsmVenueId) => void;
  onConfirmLogistics: (matchId: string) => void;
  onCheckIn: (matchId: string, outcome: 'met' | 'did_not_meet') => void;
  onCancelMatch: (matchId: string) => void;
  onOpenSafety: (partner: StudentProfile, requestId: string | null) => void;
}

export function MutualMatchSlip({
  match,
  currentUserId,
  requestA,
  requestB,
  partner,
  busyId,
  onAcceptMatch,
  onProposeLogistics,
  onConfirmLogistics,
  onCheckIn,
  onCancelMatch,
  onOpenSafety,
}: MutualMatchSlipProps) {
  const isSideA = match.studentAId === currentUserId;
  const myOptIn = isSideA ? match.studentAOptIn : match.studentBOptIn;
  const partnerOptIn = isSideA ? match.studentBOptIn : match.studentAOptIn;
  const myReq = isSideA ? requestA : requestB;
  const peerReq = isSideA ? requestB : requestA;
  const displayReq = myReq || peerReq;

  const myConfirmedLogistics = match.confirmedByIds.includes(currentUserId);
  const partnerId = isSideA ? match.studentBId : match.studentAId;
  const partnerConfirmedLogistics = match.confirmedByIds.includes(partnerId);
  const myCheckIn = match.checkInByIds[currentUserId];

  const [slotId, setSlotId] = useState<TimeSlotId>(
    match.proposedSlot || displayReq?.availableSlots[0] || 'today_17_15'
  );
  const [venueId, setVenueId] = useState<FsmVenueId>(
    match.proposedVenue || displayReq?.preferredVenue || 'fsm_bibliotheque'
  );

  const activeVenue = FSM_VENUES[match.proposedVenue || venueId];
  const activeSlot = TIME_SLOTS[match.proposedSlot || slotId];
  const isBusy = busyId === match.id || busyId === peerReq?.id;

  const statusMeta = (() => {
    switch (match.status) {
      case 'confirmed':
        return { label: 'Confirmed Public Meetup', cls: 'status-pill is-confirmed' };
      case 'arranging_details':
        return { label: 'Mutual Match · Confirm Time & Place', cls: 'status-pill is-pending' };
      case 'pending_mutual':
        return { label: 'Awaiting Mutual Opt-In', cls: 'status-pill is-pending' };
      case 'completed':
        return { label: 'Completed on Campus', cls: 'status-pill is-confirmed' };
      case 'cancelled':
        return { label: 'Withdrawn', cls: 'status-pill is-cancelled' };
      case 'open':
        return { label: 'Open Slip', cls: 'status-pill' };
    }
  })();

  const proposalMatchesSelection =
    match.proposedSlot === slotId && match.proposedVenue === venueId;

  return (
    <article className="perforated-slip" aria-label={`Match slip ${match.id}`}>
      {/* UPPER HALF: Mutual Intent & Compatibility Summary */}
      <div className="slip-upper">
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
          <span className={statusMeta.cls}>{statusMeta.label}</span>
          <span className="mono-label num">
            SLIP #{match.id.toUpperCase()} · 5/5 AXES PASSED
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
          {displayReq?.title || 'Campus Activity Session'}
        </h3>

        <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          Partner:{' '}
          <strong style={{ color: 'var(--fg)' }}>{partner?.fullName || 'FSM Student'}</strong> (
          {partner?.department}) ·{' '}
          {displayReq ? ACTIVITY_META[displayReq.activity].label : 'Activity'} ·{' '}
          {displayReq ? PURPOSE_LABELS[displayReq.purpose] : ''}
        </p>

        {/* Two-sided opt-in stamps */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-2)',
          }}
        >
          <div className="axis-cell">
            <div className="mono-label">Your Intent Opt-In</div>
            <div style={{ fontWeight: 600, marginTop: 2, fontSize: 'var(--text-sm)' }}>
              {myOptIn ? 'Stamped · Accepted' : 'Action needed · Review & Opt In'}
            </div>
          </div>
          <div className="axis-cell">
            <div className="mono-label">{partner?.fullName || 'Partner'} Opt-In</div>
            <div style={{ fontWeight: 600, marginTop: 2, fontSize: 'var(--text-sm)' }}>
              {partnerOptIn ? 'Stamped · Accepted' : 'Waiting for their choice'}
            </div>
          </div>
        </div>
      </div>

      {/* PERFORATION TEAR-LINE */}
      <hr className="slip-perforation" />

      {/* LOWER STUB: Structured Public Campus Venue & Time Confirmation (No Open Chat) */}
      <div className="slip-lower">
        {match.status === 'pending_mutual' && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}
          >
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
              {myOptIn
                ? `You opted in. Public FSM venue & exact slot unlock as soon as ${
                    partner?.fullName || 'your peer'
                  } accepts (switch persona in the left rail to simulate their side).`
                : `${
                    partner?.fullName || 'Your peer'
                  } opted in for this exact purpose. Accept to unlock public venue confirmation, or pass privately without shaming.`}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {!myOptIn && myReq && peerReq && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isBusy}
                  onClick={() => onAcceptMatch(myReq.id, peerReq.id)}
                >
                  <IconCheck size={16} />
                  <span>{isBusy ? 'Saving…' : 'Complete mutual match'}</span>
                </button>
              )}
              <button
                type="button"
                className="btn"
                disabled={isBusy}
                onClick={() => onCancelMatch(match.id)}
              >
                <IconX size={16} />
                <span>{myOptIn ? 'Withdraw' : 'Pass quietly'}</span>
              </button>
            </div>
          </div>
        )}

        {match.status === 'arranging_details' && (
          <div>
            <div className="mono-label" style={{ marginBottom: 10 }}>
              Structured Public Meetup Confirmation (Replaces Open Chat)
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <div className="field-group">
                <label className="field-label" htmlFor={`venue-${match.id}`}>
                  Approved Public FSM Venue
                </label>
                <select
                  id={`venue-${match.id}`}
                  className="select-control"
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value as FsmVenueId)}
                >
                  {(Object.keys(FSM_VENUES) as FsmVenueId[]).map((vid) => (
                    <option key={vid} value={vid}>
                      {FSM_VENUES[vid].name} ({FSM_VENUES[vid].zone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor={`slot-${match.id}`}>
                  Campus Time Slot
                </label>
                <select
                  id={`slot-${match.id}`}
                  className="select-control num"
                  value={slotId}
                  onChange={(e) => setSlotId(e.target.value as TimeSlotId)}
                >
                  {(Object.keys(TIME_SLOTS) as TimeSlotId[]).map((sid) => (
                    <option key={sid} value={sid}>
                      {TIME_SLOTS[sid].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
              {match.proposedSlot && match.proposedVenue ? (
                <>
                  Current proposal:{' '}
                  <strong style={{ color: 'var(--fg)' }}>
                    {FSM_VENUES[match.proposedVenue].name} · {TIME_SLOTS[match.proposedSlot].label}
                  </strong>{' '}
                  ({myConfirmedLogistics ? 'You confirmed' : 'Needs your confirmation'} ·{' '}
                  {partnerConfirmedLogistics ? 'Partner confirmed' : 'Needs partner confirmation'})
                </>
              ) : (
                'Select an approved public FSM spot and propose the meeting window.'
              )}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {match.proposedSlot &&
              match.proposedVenue &&
              proposalMatchesSelection &&
              !myConfirmedLogistics ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isBusy}
                  onClick={() => onConfirmLogistics(match.id)}
                >
                  <IconCheck size={16} />
                  <span>{isBusy ? 'Confirming…' : 'Confirm proposed time & FSM venue'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isBusy}
                  onClick={() => onProposeLogistics(match.id, slotId, venueId)}
                >
                  <IconCheck size={16} />
                  <span>
                    {isBusy ? 'Saving…' : 'Propose selected time & public venue'}
                  </span>
                </button>
              )}

              <button
                type="button"
                className="btn"
                disabled={isBusy}
                onClick={() => onCancelMatch(match.id)}
              >
                Cancel match
              </button>

              {partner && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onOpenSafety(partner, peerReq?.id || null)}
                >
                  <IconShield size={15} />
                  <span>Report / Block</span>
                </button>
              )}
            </div>
          </div>
        )}

        {(match.status === 'confirmed' || match.status === 'completed') && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--space-4)',
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <IconMapPin size={16} />
                  {activeVenue?.name || 'FSM Public Venue'}
                </span>
                <span
                  className="num"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <IconClock size={16} />
                  {activeSlot?.label}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
                Safety note: {activeVenue?.safetyNote}{' '}
                {displayReq ? `(${ROLE_LABELS[displayReq.roleMode]})` : ''}
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {match.status === 'confirmed' && !myCheckIn && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isBusy}
                  onClick={() => onCheckIn(match.id, 'met')}
                >
                  <IconCheck size={16} />
                  <span>{isBusy ? 'Recording…' : 'Check in: we met on campus'}</span>
                </button>
              )}
              {myCheckIn === 'met' && (
                <span className="status-pill is-confirmed">Checked in · Met on campus</span>
              )}
              {match.status === 'confirmed' && (
                <button
                  type="button"
                  className="btn"
                  disabled={isBusy}
                  onClick={() => onCancelMatch(match.id)}
                >
                  Cancel meetup
                </button>
              )}
              {partner && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onOpenSafety(partner, peerReq?.id || null)}
                >
                  <IconShield size={15} />
                  <span>Safety</span>
                </button>
              )}
            </div>
          </div>
        )}

        {match.status === 'cancelled' && (
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
            This match slip was withdrawn cleanly before completion; open requests returned to the
            FSM board.
          </p>
        )}
      </div>
    </article>
  );
}
