import {
  ACTIVITY_META,
  FSM_VENUES,
  PURPOSE_LABELS,
  ROLE_LABELS,
  TIME_SLOTS,
  buildFreshSeedDatabase,
} from './mockData.ts';
import type {
  ActivityCategory,
  ActivityRequest,
  CompatibilityEvaluation,
  DemoDatabase,
  FsmVenueId,
  IntentPurpose,
  RoleMode,
  SafetyReport,
  TimeSlotId,
} from './types.ts';

export const STORAGE_KEY = 'wink_fsm_demo_db_v1';
export const FAULT_FLAG_KEY = 'wink_fsm_simulate_fault';

/* In-memory fallback if browser blocks localStorage (e.g. strict privacy sandbox) */
let memoryFallback: string | null = null;

function rawRead(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    /* fall through to in-memory store */
  }
  return key === STORAGE_KEY ? memoryFallback : null;
}

function rawWrite(key: string, value: string): void {
  if (key === STORAGE_KEY) memoryFallback = value;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    /* quota or sandbox restriction — memoryFallback preserves session state */
  }
}

export function isFaultSimulationEnabled(): boolean {
  return rawRead(FAULT_FLAG_KEY) === '1';
}

export function setFaultSimulation(enabled: boolean): void {
  rawWrite(FAULT_FLAG_KEY, enabled ? '1' : '0');
}

function isValidDb(candidate: unknown): candidate is DemoDatabase {
  if (!candidate || typeof candidate !== 'object') return false;
  const db = candidate as Partial<DemoDatabase>;
  return (
    db.schemaVersion === 1 &&
    typeof db.activeStudentId === 'string' &&
    Array.isArray(db.students) &&
    db.students.length > 0 &&
    Array.isArray(db.requests) &&
    Array.isArray(db.matches) &&
    Array.isArray(db.reports) &&
    Array.isArray(db.blocks)
  );
}

/**
 * Synchronous snapshot reader with automatic self-healing if storage is missing or corrupted.
 */
export function readDemoDbSync(): DemoDatabase {
  const raw = rawRead(STORAGE_KEY);
  if (!raw) {
    const fresh = buildFreshSeedDatabase();
    rawWrite(STORAGE_KEY, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isValidDb(parsed)) return parsed;
  } catch {
    /* self-heal corrupted JSON below */
  }
  const healed = buildFreshSeedDatabase();
  rawWrite(STORAGE_KEY, JSON.stringify(healed, null, 2));
  return healed;
}

function persistDbSync(db: DemoDatabase): DemoDatabase {
  rawWrite(STORAGE_KEY, JSON.stringify(db, null, 2));
  return db;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

async function simulateAsync<T>(
  work: () => T,
  opts: { latencyMs?: number; signal?: AbortSignal } = {}
): Promise<T> {
  const { latencyMs = 190, signal } = opts;
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, latencyMs);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });

  if (isFaultSimulationEnabled()) {
    throw new Error('ECONNREFUSED: Simulated localStorage persistence fault');
  }
  return work();
}

/**
 * 5-Axis Intent Compatibility Engine — implements `/plan/iyed.md` strictly:
 * 1. FSM-only community & public campus venue
 * 2. Exact Activity match
 * 3. Exact Purpose match (never matches "play football" with "coffee / conversation")
 * 4. Complementary Role Fit (`need_player` <-> `available_player`, or `co_participant` <-> `co_participant`)
 * 5. Overlapping availability slot(s)
 */
export function evaluateCompatibility(
  myReq: ActivityRequest,
  otherReq: ActivityRequest
): CompatibilityEvaluation {
  const fsmOk = Boolean(FSM_VENUES[myReq.preferredVenue] && FSM_VENUES[otherReq.preferredVenue]);
  const activityOk = myReq.activity === otherReq.activity;
  const purposeOk = myReq.purpose === otherReq.purpose;

  const rolesCompatible =
    (myReq.roleMode === 'need_player' && otherReq.roleMode === 'available_player') ||
    (myReq.roleMode === 'available_player' && otherReq.roleMode === 'need_player') ||
    (myReq.roleMode === 'co_participant' && otherReq.roleMode === 'co_participant');

  const sharedSlots = myReq.availableSlots.filter((s) => otherReq.availableSlots.includes(s));
  const timeOk = sharedSlots.length > 0;

  const axes: CompatibilityEvaluation['axes'] = [
    {
      axis: 'FSM Scope',
      passed: fsmOk,
      summary: fsmOk ? 'Both restricted to verified FSM public campus venues' : 'Outside FSM boundary',
    },
    {
      axis: 'Activity',
      passed: activityOk,
      summary: activityOk
        ? `Both selected ${ACTIVITY_META[myReq.activity].label}`
        : `Mismatch: ${ACTIVITY_META[myReq.activity].label} vs. ${ACTIVITY_META[otherReq.activity].label}`,
    },
    {
      axis: 'Purpose',
      passed: purposeOk,
      summary: purposeOk
        ? PURPOSE_LABELS[myReq.purpose]
        : `Incompatible intent: "${PURPOSE_LABELS[myReq.purpose]}" vs. "${PURPOSE_LABELS[otherReq.purpose]}"`,
    },
    {
      axis: 'Role Fit',
      passed: rolesCompatible,
      summary: rolesCompatible
        ? `${ROLE_LABELS[myReq.roleMode]} pairs with ${ROLE_LABELS[otherReq.roleMode]}`
        : `Role conflict: ${ROLE_LABELS[myReq.roleMode]} cannot fill ${ROLE_LABELS[otherReq.roleMode]}`,
    },
    {
      axis: 'Time Overlap',
      passed: timeOk,
      summary: timeOk
        ? `${sharedSlots.length} shared window(s): ${sharedSlots.map((s) => TIME_SLOTS[s].label).join(', ')}`
        : 'No overlapping campus time slots',
    },
  ];

  const score = axes.filter((a) => a.passed).length;
  const compatible = fsmOk && activityOk && purposeOk && rolesCompatible && timeOk;

  let headlineReason = '';
  if (compatible) {
    headlineReason = `Compatible ${ACTIVITY_META[myReq.activity].label} intent · ${sharedSlots
      .map((s) => TIME_SLOTS[s].label)
      .join(' or ')}`;
  } else {
    const firstFailed = axes.find((a) => !a.passed);
    headlineReason = firstFailed ? firstFailed.summary : 'Intent fields do not align';
  }

  return { compatible, score, headlineReason, axes, sharedSlots };
}

/* ==================== Async DB Operations ==================== */

export async function loadDemoDatabase(signal?: AbortSignal): Promise<DemoDatabase> {
  return simulateAsync(() => readDemoDbSync(), { latencyMs: 220, signal });
}

export async function switchActiveStudent(studentId: string): Promise<DemoDatabase> {
  return simulateAsync(() => {
    const db = readDemoDbSync();
    if (!db.students.some((s) => s.id === studentId)) {
      throw new Error('Student persona not found');
    }
    db.activeStudentId = studentId;
    return persistDbSync(db);
  }, { latencyMs: 120 });
}

export interface CreateRequestInput {
  title: string;
  activity: ActivityCategory;
  purpose: IntentPurpose;
  roleMode: RoleMode;
  roleDetail: string;
  availableSlots: TimeSlotId[];
  preferredVenue: FsmVenueId;
  contextNote: string;
}

export async function createActivityRequest(input: CreateRequestInput): Promise<{
  db: DemoDatabase;
  created: ActivityRequest;
}> {
  return simulateAsync(() => {
    const db = readDemoDbSync();
    const title = input.title.trim().slice(0, 110);
    if (title.length < 6) throw new Error('Validation: Enter a clear title (at least 6 characters).');
    if (!input.availableSlots.length) throw new Error('Validation: Select at least one campus time window.');

    const created: ActivityRequest = {
      id: makeId('req'),
      authorId: db.activeStudentId,
      title,
      activity: input.activity,
      purpose: input.purpose,
      roleMode: input.roleMode,
      roleDetail: input.roleDetail.trim().slice(0, 100) || ROLE_LABELS[input.roleMode],
      availableSlots: input.availableSlots,
      preferredVenue: input.preferredVenue,
      contextNote: input.contextNote.trim().slice(0, 220) || 'Meet at the public campus landmark on time.',
      createdAt: new Date().toISOString(),
      status: 'open',
    };

    db.requests.unshift(created);
    return { db: persistDbSync(db), created };
  }, { latencyMs: 260 });
}

export async function optInCompatibleRequest(
  myRequestId: string,
  targetRequestId: string
): Promise<DemoDatabase> {
  return simulateAsync(() => {
    const db = readDemoDbSync();
    const myReq = db.requests.find((r) => r.id === myRequestId);
    const targetReq = db.requests.find((r) => r.id === targetRequestId);
    if (!myReq || !targetReq) throw new Error('Request no longer available');
    if (myReq.authorId !== db.activeStudentId) throw new Error('Select one of your own requests first');

    const check = evaluateCompatibility(myReq, targetReq);
    if (!check.compatible) {
      throw new Error(`Incompatible intent blocked: ${check.headlineReason}`);
    }

    let match = db.matches.find(
      (m) =>
        m.status !== 'cancelled' &&
        ((m.requestAId === myRequestId && m.requestBId === targetRequestId) ||
          (m.requestAId === targetRequestId && m.requestBId === myRequestId))
    );

    if (!match) {
      match = {
        id: makeId('mtc'),
        requestAId: myRequestId,
        studentAId: myReq.authorId,
        requestBId: targetRequestId,
        studentBId: targetReq.authorId,
        studentAOptIn: true,
        studentBOptIn: false,
        status: 'pending_mutual',
        proposedSlot: null,
        proposedVenue: null,
        proposedById: null,
        confirmedByIds: [],
        checkInByIds: {},
        updatedAt: new Date().toISOString(),
      };
      db.matches.unshift(match);
    } else {
      if (match.studentAId === db.activeStudentId) match.studentAOptIn = true;
      if (match.studentBId === db.activeStudentId) match.studentBOptIn = true;
      match.updatedAt = new Date().toISOString();
    }

    if (match.studentAOptIn && match.studentBOptIn && match.status === 'pending_mutual') {
      match.status = 'arranging_details';
      match.proposedSlot = check.sharedSlots[0] || myReq.availableSlots[0];
      match.proposedVenue = myReq.preferredVenue;
      match.proposedById = db.activeStudentId;
      match.confirmedByIds = [db.activeStudentId];
      myReq.status = 'arranging_details';
      targetReq.status = 'arranging_details';
    }

    return persistDbSync(db);
  }, { latencyMs: 240 });
}

export async function proposeMatchLogistics(
  matchId: string,
  slot: TimeSlotId,
  venue: FsmVenueId
): Promise<DemoDatabase> {
  return simulateAsync(() => {
    const db = readDemoDbSync();
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match record not found');
    if (match.studentAId !== db.activeStudentId && match.studentBId !== db.activeStudentId) {
      throw new Error('Unauthorized participant');
    }

    match.proposedSlot = slot;
    match.proposedVenue = venue;
    match.proposedById = db.activeStudentId;
    match.confirmedByIds = [db.activeStudentId]; // Counter-proposal resets confirmation to proposer
    match.status = 'arranging_details';
    match.updatedAt = new Date().toISOString();
    return persistDbSync(db);
  }, { latencyMs: 220 });
}

export async function confirmMatchLogistics(matchId: string): Promise<DemoDatabase> {
  return simulateAsync(() => {
    const db = readDemoDbSync();
    const match = db.matches.find((m) => m.id === matchId);
    if (!match || !match.proposedSlot || !match.proposedVenue) {
      throw new Error('Propose a time and FSM campus location first');
    }
    if (!match.confirmedByIds.includes(db.activeStudentId)) {
      match.confirmedByIds.push(db.activeStudentId);
    }
    if (
      match.confirmedByIds.includes(match.studentAId) &&
      match.confirmedByIds.includes(match.studentBId)
    ) {
      match.status = 'confirmed';
      const reqA = db.requests.find((r) => r.id === match.requestAId);
      const reqB = db.requests.find((r) => r.id === match.requestBId);
      if (reqA) reqA.status = 'confirmed';
      if (reqB) reqB.status = 'confirmed';
    }
    match.updatedAt = new Date().toISOString();
    return persistDbSync(db);
  }, { latencyMs: 240 });
}

export async function withdrawOrCancelMatch(matchId: string): Promise<DemoDatabase> {
  return simulateAsync(() => {
    const db = readDemoDbSync();
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');
    match.status = 'cancelled';
    match.updatedAt = new Date().toISOString();
    const reqA = db.requests.find((r) => r.id === match.requestAId);
    const reqB = db.requests.find((r) => r.id === match.requestBId);
    if (reqA && reqA.status !== 'completed') reqA.status = 'open';
    if (reqB && reqB.status !== 'completed') reqB.status = 'open';
    return persistDbSync(db);
  }, { latencyMs: 200 });
}

export async function submitMeetCheckIn(
  matchId: string,
  outcome: 'met' | 'did_not_meet'
): Promise<DemoDatabase> {
  return simulateAsync(() => {
    const db = readDemoDbSync();
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');
    match.checkInByIds[db.activeStudentId] = outcome;
    if (outcome === 'met') {
      match.status = 'completed';
      const reqA = db.requests.find((r) => r.id === match.requestAId);
      const reqB = db.requests.find((r) => r.id === match.requestBId);
      if (reqA) reqA.status = 'completed';
      if (reqB) reqB.status = 'completed';
    }
    match.updatedAt = new Date().toISOString();
    return persistDbSync(db);
  }, { latencyMs: 200 });
}

export async function reportAndOptionallyBlock(input: {
  targetStudentId: string;
  requestId: string | null;
  reason: SafetyReport['reason'];
  note: string;
  alsoBlock: boolean;
}): Promise<DemoDatabase> {
  return simulateAsync(() => {
    const db = readDemoDbSync();
    db.reports.unshift({
      id: makeId('rep'),
      reporterId: db.activeStudentId,
      targetStudentId: input.targetStudentId,
      requestId: input.requestId,
      reason: input.reason,
      note: input.note.trim().slice(0, 240),
      createdAt: new Date().toISOString(),
    });
    if (
      input.alsoBlock &&
      !db.blocks.some(
        (b) => b.blockerId === db.activeStudentId && b.blockedStudentId === input.targetStudentId
      )
    ) {
      db.blocks.push({
        blockerId: db.activeStudentId,
        blockedStudentId: input.targetStudentId,
        createdAt: new Date().toISOString(),
      });
      // Cancel any pending/active matches with blocked student cleanly
      db.matches.forEach((m) => {
        const involvesPair =
          (m.studentAId === db.activeStudentId && m.studentBId === input.targetStudentId) ||
          (m.studentBId === db.activeStudentId && m.studentAId === input.targetStudentId);
        if (involvesPair && m.status !== 'completed') m.status = 'cancelled';
      });
    }
    return persistDbSync(db);
  }, { latencyMs: 220 });
}

export async function withdrawActivityRequest(requestId: string): Promise<DemoDatabase> {
  return simulateAsync(() => {
    const db = readDemoDbSync();
    const req = db.requests.find((r) => r.id === requestId && r.authorId === db.activeStudentId);
    if (!req) throw new Error('Activity slip not found');
    req.status = 'cancelled';
    db.matches.forEach((m) => {
      if ((m.requestAId === requestId || m.requestBId === requestId) && m.status !== 'completed') {
        m.status = 'cancelled';
      }
    });
    return persistDbSync(db);
  }, { latencyMs: 180 });
}

export async function resetDemoDatabase(): Promise<DemoDatabase> {
  return simulateAsync(() => {
    const fresh = buildFreshSeedDatabase();
    return persistDbSync(fresh);
  }, { latencyMs: 220 });
}

export function getStorageByteSize(): number {
  const raw = rawRead(STORAGE_KEY) || '';
  return new Blob([raw]).size;
}
