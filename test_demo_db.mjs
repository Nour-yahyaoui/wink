import assert from 'node:assert/strict';
import {
  STORAGE_KEY,
  confirmMatchLogistics,
  createActivityRequest,
  evaluateCompatibility,
  loadDemoDatabase,
  optInCompatibleRequest,
  proposeMatchLogistics,
  readDemoDbSync,
  reportAndOptionallyBlock,
  resetDemoDatabase,
  setFaultSimulation,
  submitMeetCheckIn,
  switchActiveStudent,
  withdrawActivityRequest,
} from './database-demo/localStorageDb.ts';

// Minimal W3C Web Storage mock for Node CLI verification
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
};

async function run() {
  // 1. Seed hydration
  const db = await loadDemoDatabase();
  assert.equal(db.schemaVersion, 1);
  assert.equal(db.students.length, 6);
  assert.equal(db.requests.length, 9);
  assert.equal(db.matches.length, 3);
  assert.ok(store.get(STORAGE_KEY).includes('stu_amine'));

  // 2. Self-healing corrupted JSON
  store.set(STORAGE_KEY, '{corrupted-json');
  const healed = readDemoDbSync();
  assert.equal(healed.schemaVersion, 1);
  assert.equal(healed.requests.length, 9);

  // 3. 5-axis compatibility engine
  const amineFtb = healed.requests.find((r) => r.id === 'req_amine_football');
  const hamzaFtb = healed.requests.find((r) => r.id === 'req_hamza_football');
  const yasmineCoffee = healed.requests.find((r) => r.id === 'req_yasmine_coffee');

  const ftbCheck = evaluateCompatibility(amineFtb, hamzaFtb);
  assert.equal(ftbCheck.compatible, true);
  assert.equal(ftbCheck.score, 5);
  assert.deepEqual(ftbCheck.sharedSlots, ['today_17_15']);

  const mismatchCheck = evaluateCompatibility(amineFtb, yasmineCoffee);
  assert.equal(mismatchCheck.compatible, false);

  // 4. Reject incompatible opt-in attempt
  await assert.rejects(
    () => optInCompatibleRequest('req_amine_football', 'req_yasmine_coffee'),
    /Incompatible intent blocked/
  );

  // 5. Mutual opt-in + two-sided public venue confirmation + check-in
  let afterA = await optInCompatibleRequest('req_amine_football', 'req_hamza_football');
  const createdMatch = afterA.matches.find(
    (m) => m.requestAId === 'req_amine_football' && m.requestBId === 'req_hamza_football'
  );
  assert.ok(createdMatch);
  assert.equal(createdMatch.status, 'pending_mutual');

  await switchActiveStudent('stu_hamza');
  let afterB = await optInCompatibleRequest('req_hamza_football', 'req_amine_football');
  const mutualMatch = afterB.matches.find((m) => m.id === createdMatch.id);
  assert.equal(mutualMatch.status, 'arranging_details');

  await proposeMatchLogistics(createdMatch.id, 'today_17_15', 'fsm_stade');
  await switchActiveStudent('stu_amine');
  const confirmedDb = await confirmMatchLogistics(createdMatch.id);
  const confirmedMatch = confirmedDb.matches.find((m) => m.id === createdMatch.id);
  assert.equal(confirmedMatch.status, 'confirmed');

  const completedDb = await submitMeetCheckIn(createdMatch.id, 'met');
  assert.equal(
    completedDb.matches.find((m) => m.id === createdMatch.id).status,
    'completed'
  );

  // 6. Create & withdraw slip
  const { created } = await createActivityRequest({
    title: 'Algorithms & Complexity TD4 Drill',
    activity: 'exam_prep',
    purpose: 'solve_past_exam_papers',
    roleMode: 'co_participant',
    roleDetail: '1-to-1 past-paper review',
    availableSlots: ['tomorrow_14_00'],
    preferredVenue: 'fsm_bibliotheque',
    contextNote: 'Meet by ground floor study tables',
  });
  const afterWithdraw = await withdrawActivityRequest(created.id);
  assert.equal(
    afterWithdraw.requests.find((r) => r.id === created.id).status,
    'cancelled'
  );

  // 7. Safety report + block cancels uncompleted matches between pair
  const afterBlock = await reportAndOptionallyBlock({
    targetStudentId: 'stu_karim',
    requestId: 'req_karim_football',
    reason: 'mismatched_intent',
    note: 'Test safety block',
    alsoBlock: true,
  });
  assert.equal(afterBlock.blocks.length, 1);
  assert.equal(
    afterBlock.matches.find((m) => m.id === 'mtc_karim_amine_ftb').status,
    'cancelled'
  );

  // 8. Fault simulation & reset
  setFaultSimulation(true);
  await assert.rejects(() => loadDemoDatabase(), /ECONNREFUSED/);
  setFaultSimulation(false);
  const resetDb = await resetDemoDatabase();
  assert.equal(resetDb.blocks.length, 0);

  console.log('DATABASE-DEMO LOCALSTORAGE ADAPTER TEST: OK (8/8 suites passed)');
}

run();
