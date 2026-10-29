/* Regression test: legacy user records (no hobbies/photos/seek keys, as stored by
   earlier app versions) must not crash boot() or login — they get normalized and
   routed to the profile-setup step. */
const noop = () => {};
const fakeEl = () => ({
  addEventListener: noop,
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  style: {},
  innerHTML: '', textContent: '', hidden: false, value: '', dataset: {},
  appendChild: noop, remove: noop, scrollIntoView: noop, focus: noop,
  querySelector: () => null, querySelectorAll: () => [],
  matches: () => false, closest: () => null,
});
global.document = {
  querySelector: () => fakeEl(),
  querySelectorAll: () => [],
  addEventListener: noop,
  createElement: () => fakeEl(),
  body: { style: {} },
};
global.window = global;
global.addEventListener = noop;
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
global.fetch = async () => { throw new Error('offline'); };
global.confirm = () => true;
global.navigator = { clipboard: { writeText: async () => {} } };

// simulate a localStorage db written by an OLD app version: user without hobbies/photos
const legacyDb = {
  users: {
    'Old User': {
      id: 'umvpr0000000000001', name: 'Old User', initials: 'OU', handle: '@old',
      hue: '#8b5cf6', createdAt: '2026-09-01T00:00:00.000Z',
    },
  },
  sessions: { 'legacy-token': 'Old User' },
  meetups: [], chats: {},
};
store['wink_local_db'] = JSON.stringify(legacyDb);
store['wink_token'] = 'legacy-token';

const path = require('path');
require(path.join(__dirname, 'wink/public/js/app.js'));
const { boot, doLogin, localApi, getLocalDB, getLocalMode } = window.__wink;

(async () => {
  await boot(); // must not throw even though user has no hobbies/photos
  console.log('1. boot with legacy user: no crash | localMode:', getLocalMode());

  const db = getLocalDB();
  const u = db.users['Old User'];
  console.log('2. stored user untouched:', JSON.stringify(u));
  console.log('   sessions:', Object.keys(db.sessions).join(','));

  // sign in again as the legacy user — response must be normalized
  const d = await localApi('/login', { method: 'POST', body: JSON.stringify({ name: 'Old User' }) });
  console.log('3. login response: hobbies =', JSON.stringify(d.user.hobbies), '| photos =', d.user.photos.length, '| seek =', JSON.stringify(d.user.seek), '| bio =', JSON.stringify(d.user.bio));

  // now onboard with full profile data
  const onb = await localApi('/onboard', { method: 'POST', body: JSON.stringify({ hobbies: ['music', 'travel'], seek: 'Music friends', bio: 'hello', photos: ['🎸', '🌊', '📚', '🎬', '🏀', '⚽'] }) });
  console.log('4. onboard: hobbies =', onb.user.hobbies.join(','), '| photos =', onb.user.photos.join(','));

  // people list must still work with the normalized current user
  const pl = await localApi('/people');
  console.log('5. people list ok:', pl.people.length, 'candidates | first:', pl.people[0].name);

  console.log('LEGACY USER TEST: OK');
})().catch((e) => { console.error('LEGACY TEST FAILED:', e); process.exit(1); });
