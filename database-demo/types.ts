/**
 * W.I.N.K — FSM Activity & Mutual-Meetup Demo Schema
 * Derived directly from `/plan/iyed.md` (FSM-only, purpose-before-profile,
 * strict intent compatibility, mutual choice, two-sided logistics, no chat).
 */

export type ActivityCategory =
  | 'football_5v5'
  | 'coffee_break'
  | 'exam_prep'
  | 'chess_blitz'
  | 'table_tennis'
  | 'lab_review';

export type IntentPurpose =
  | 'play_competitive_or_casual_game'
  | 'share_in_person_coffee'
  | 'solve_past_exam_papers'
  | 'play_board_or_table_match'
  | 'prepare_practical_tp_lab';

export type RoleMode =
  | 'need_player'
  | 'available_player'
  | 'co_participant';

export type TimeSlotId =
  | 'today_12_30'
  | 'today_15_00'
  | 'today_17_15'
  | 'tomorrow_10_30'
  | 'tomorrow_14_00'
  | 'tomorrow_16_30'
  | 'thu_17_00';

export type FsmVenueId =
  | 'fsm_stade'
  | 'fsm_cafeteria'
  | 'fsm_bibliotheque'
  | 'fsm_jardin_sciences'
  | 'fsm_esplanade_amphi_a'
  | 'fsm_hall_info';

export type PlanLifecycleStatus =
  | 'open'
  | 'pending_mutual'
  | 'arranging_details'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export interface StudentProfile {
  id: string;
  fullName: string;
  initials: string;
  department: string; // e.g. "LSI 2 — Computer Science", "LFI 3 — Fundamentals"
  fsmVerifiedNote: string; // e.g. "@fsm.u-monastir.tn institutional check"
  reliabilityNote: string;
  joinedAt: string;
}

export interface ActivityRequest {
  id: string;
  authorId: string;
  title: string;
  activity: ActivityCategory;
  purpose: IntentPurpose;
  roleMode: RoleMode;
  roleDetail: string; // e.g. "Need 1 outfield or keeper for 5v5"
  availableSlots: TimeSlotId[];
  preferredVenue: FsmVenueId;
  contextNote: string; // brief structured note, never an open social bio
  createdAt: string;
  status: PlanLifecycleStatus;
}

/**
 * Independent opt-in record between two compatible requests/students.
 * A match becomes mutual ONLY when both `initiatorOptIn` and `targetOptIn` are true.
 * One-sided declines/withdrawals simply remove/archive without shaming the other user.
 */
export interface MutualMatchRecord {
  id: string;
  requestAId: string;
  studentAId: string;
  requestBId: string;
  studentBId: string;
  studentAOptIn: boolean;
  studentBOptIn: boolean;
  status: PlanLifecycleStatus;
  proposedSlot: TimeSlotId | null;
  proposedVenue: FsmVenueId | null;
  proposedById: string | null;
  confirmedByIds: string[]; // requires BOTH studentAId and studentBId to reach 'confirmed'
  checkInByIds: Record<string, 'met' | 'did_not_meet'>;
  updatedAt: string;
}

export interface SafetyReport {
  id: string;
  reporterId: string;
  targetStudentId: string;
  requestId: string | null;
  reason: 'mismatched_intent' | 'no_show' | 'unsafe_venue_push' | 'inappropriate_conduct';
  note: string;
  createdAt: string;
}

export interface BlockRecord {
  blockerId: string;
  blockedStudentId: string;
  createdAt: string;
}

export interface DemoDatabase {
  schemaVersion: 1;
  seededAt: string;
  activeStudentId: string;
  students: StudentProfile[];
  requests: ActivityRequest[];
  matches: MutualMatchRecord[];
  reports: SafetyReport[];
  blocks: BlockRecord[];
}

export interface CompatibilityAxis {
  axis: 'FSM Scope' | 'Activity' | 'Purpose' | 'Role Fit' | 'Time Overlap';
  passed: boolean;
  summary: string;
}

export interface CompatibilityEvaluation {
  compatible: boolean;
  score: number; // 0..5 axes passed
  headlineReason: string;
  axes: CompatibilityAxis[];
  sharedSlots: TimeSlotId[];
}
