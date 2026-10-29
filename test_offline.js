/* Test harness: loads app.js with DOM/localStorage stubs and fetch FAILING (offline),
   then exercises the full offline demo flow: boot → login → onboard → feed → join →
   comment → review → again → chats → create. */
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
global.fetch = async () => { throw new Error('offline'); }; // simulate no server
global.confirm = () => true;
global.navigator = { clipboard: { writeText: async () => {} } };

const path = require('path');
require(path.join(__dirname, 'wink/public/js/app.js'));
  const { doLogin, enterApp, boot, localApi, openPersonModal, getLocalMode, getLocalDB } = window.__wink;

(async () => {
  await boot(); // ensure boot completed
  console.log('1. offline mode after boot:', getLocalMode());

  await doLogin('Test User', 'testuser');
  const db = getLocalDB();
  console.log('2. login: users =', Object.keys(db.users).join(','), '| sessions =', Object.keys(db.sessions).length, '| photos =', db.users['Test User'].photos.length);

  const onb = await localApi('/onboard', { method: 'POST', body: JSON.stringify({ hobbies: ['football', 'coffee'], seek: 'Friends to chill with', bio: 'Test bio', photos: ['🎬', '📚', '🌅', '🎸', '🌊', '🏀'] }) });
  console.log('3. onboard hobbies:', onb.user.hobbies.join(','), '| seek:', onb.user.seek, '| photos:', onb.user.photos.join(','));

  const list = await localApi('/meetups');
  const m1 = list.meetups.find((m) => m.id === 'm1');
  console.log('4. feed:', list.meetups.length, 'meets | m1 status:', m1.status, '| m1 comments:', m1.comments.length, '| m1 participants:', m1.participants.length, '| match:', m1.match);
  const m9 = list.meetups.find((m) => m.id === 'm9');
  console.log('   m9 status:', m9.status, '| reviews:', m9.reviews.length, '| avg:', m9.avgRating, '| match:', m9.match);

  const joined = await localApi('/meetups/m1/join', { method: 'POST', body: '{}' });
  console.log('5. join m1 → participants:', joined.meetup.participants.length, '| joinedByMe:', joined.meetup.joinedByMe);

  const cmt = await localApi('/meetups/m1/comments', { method: 'POST', body: JSON.stringify({ text: 'nice meet!' }) });
  console.log('6. comment m1 → comments:', cmt.meetup.comments.length, '| last:', cmt.meetup.comments[cmt.meetup.comments.length - 1].text, '| author:', cmt.meetup.comments[cmt.meetup.comments.length - 1].authorName);

  const join9 = await localApi('/meetups/m9/join', { method: 'POST', body: '{}' });
  const rv = await localApi('/meetups/m9/review', { method: 'POST', body: JSON.stringify({ rating: 5, comment: 'great' }) });
  console.log('7. review m9 → reviews:', rv.meetup.reviews.length, '| avg:', rv.meetup.avgRating, '| joined first:', join9.meetup.joinedByMe);

  const ag = await localApi('/meetups/m9/again', { method: 'POST', body: '{}' });
  console.log('8. again m9 →', ag.meetup.id, '|', ag.meetup.title, '| createdByUser:', ag.meetup.createdByUser);

  const chats = await localApi('/chats/m1');
  console.log('9. chat m1 → messages:', chats.messages.length, '| first:', chats.messages[0].text.slice(0, 40));
  const msg = await localApi('/chats/m1/messages', { method: 'POST', body: JSON.stringify({ text: 'hello team' }) });
  console.log('   post message →', msg.message.text, '| author:', msg.message.authorName);

  const loc = await localApi('/chats/m1/messages', { method: 'POST', body: JSON.stringify({ kind: 'location', location: 'Café de la Place', time: '18:00' }) });
  console.log('   location card →', loc.message.kind, loc.message.location, loc.message.time);

  const f1 = await localApi('/meetups?venue=Monastir&hobby=gaming');
  console.log('10. filter Monastir+gaming:', f1.meetups.map((m) => m.id).join(','));
  const f2 = await localApi('/meetups?q=algorithms');
  console.log('    search "algorithms":', f2.meetups.map((m) => m.id).join(','));
  const f3 = await localApi('/meetups?sort=soon');
  console.log('    sort soon first:', f3.meetups[0].id, f3.meetups[0].time);

  const d = new Date(Date.now() + 3 * 86400000);
  const cr = await localApi('/meetups', { method: 'POST', body: JSON.stringify({ title: 'Test meet', desc: 'x', hobbies: ['music'], location: 'Café de la Place', date: d.toISOString().slice(0, 10), time: '20:00', capacity: 5 }) });
  console.log('11. create meet →', cr.meetup.id, '| organizer:', cr.meetup.organizer.name, '| createdByUser:', cr.meetup.createdByUser, '| chat empty:', (getLocalDB().chats[cr.meetup.id] || []).length === 0);

  // error paths
  try { await localApi('/login', { method: 'POST', body: JSON.stringify({ name: '' }) }); } catch (e) { console.log('12. empty name error:', e.message); }
  try { await localApi('/meetups/zzz/join', { method: 'POST', body: '{}' }); } catch (e) { console.log('    unknown meetup error:', e.message); }
  try { await localApi('/meetups/m2/review', { method: 'POST', body: JSON.stringify({ rating: 5 }) }); } catch (e) { console.log('    non-participant review error:', e.message); }

  // persistence
  console.log('13. persisted db in localStorage:', !!store['wink_local_db'], '| size:', store['wink_local_db'].length);

  // full render path (feed/meets/inbox/profile) with stubs
  enterApp();
  await new Promise((r) => setTimeout(r, 100));
  console.log('14. enterApp + render path completed without throwing');

  // people flow
  const pl = await localApi('/people');
  const p2 = pl.people.find((p) => p.id === 'p2');
  console.log('16. people list:', pl.people.length, '| p2:', p2.name, '| hobbies:', p2.hobbies.join(','), '| suggested:', p2.suggestedVenue);
  console.log('   no matching — order:', pl.people.map((p) => p.name).join(' | '));

  const prof = await localApi('/people/p3');
  console.log('17. person profile p3:', prof.person.name, '| rating:', prof.person.rating, '| meets:', prof.person.meets.length, '| photos:', prof.person.photos.length);

  const d2 = new Date(Date.now() + 2 * 86400000);
  const meet = await localApi('/people/p2/meet', { method: 'POST', body: JSON.stringify({ location: 'Café de la Place', date: d2.toISOString().slice(0, 10), time: '18:00' }) });
  console.log('18. meet with p2 →', meet.meetup.id, '|', meet.meetup.title, '| organizer:', meet.meetup.organizer.name);
  const meetChat = getLocalDB().chats[meet.meetup.id];
  console.log('   welcome message:', meetChat[0].text);
  const meet2 = await localApi('/people/p2/meet', { method: 'POST', body: JSON.stringify({ location: 'Café de la Place', date: d2.toISOString().slice(0, 10), time: '18:00' }) });
  console.log('   dedupe → same meetup:', meet2.meetup.id === meet.meetup.id);
  try { await localApi('/people/zzz'); } catch (e) { console.log('    unknown person error:', e.message); }

  // re-login same name keeps user
  await doLogin('Test User', 'testuser');
  console.log('19. re-login same name: hobbies kept =', getLocalDB().users['Test User'].hobbies.join(','));

  // real signed-in users appear as candidates in each other's Discover
  await doLogin('Second User', 'seconduser');
  const tu = getLocalDB().users['Test User'];
  const pl2 = await localApi('/people');
  const asReal = pl2.people.find((p) => p.id === tu.id);
  console.log('20. real user as candidate:', asReal.name, '| rating:', asReal.rating, '| bio:', asReal.bio, '| hobbies:', asReal.hobbies.join(','));

  const d3 = new Date(Date.now() + 4 * 86400000);
  const rmeet = await localApi('/people/' + tu.id + '/meet', { method: 'POST', body: JSON.stringify({ location: 'FSM — Stade universitaire', date: d3.toISOString().slice(0, 10), time: '16:00' }) });
  console.log('21. meet with real user →', rmeet.meetup.title, '| organizer:', rmeet.meetup.organizer.name, '| organizer userId:', rmeet.meetup.organizer.userId, '| == Test User id:', rmeet.meetup.organizer.userId === tu.id);

  await doLogin('Test User', 'testuser');
  const mineList = await localApi('/meetups');
  const organized = mineList.meetups.find((m) => m.organizer.userId === tu.id);
  console.log('22. organized meet visible to organizer:', organized ? organized.title : 'MISSING');

  // mutual match: both said yes → FSM location prompt
  const tu2 = getLocalDB().users['Test User'];
  const sp2 = getLocalDB().users['Second User'];
  const d4 = new Date(Date.now() + 5 * 86400000);
  await doLogin('Test User', 'testuser');
  const mm1 = await localApi('/people/' + sp2.id + '/meet', { method: 'POST', body: JSON.stringify({ location: 'Café de la Place', date: d4.toISOString().slice(0, 10), time: '18:00' }) });
  await doLogin('Second User', 'seconduser');
  const mm2 = await localApi('/people/' + tu2.id + '/meet', { method: 'POST', body: JSON.stringify({ location: 'Café de la Place', date: d4.toISOString().slice(0, 10), time: '18:00' }) });
  await doLogin('Test User', 'testuser');
  const asTU = await localApi('/meetups');
  const m1shaped = asTU.meetups.find((x) => x.id === mm1.meetup.id);
  console.log('23. mutual flag (Test User side):', m1shaped.mutual, '| counterpart:', m1shaped.mutualMeetupId === mm2.meetup.id);
  await doLogin('Second User', 'seconduser');
  const asSP = await localApi('/meetups');
  const m2shaped = asSP.meetups.find((x) => x.id === mm2.meetup.id);
  console.log('24. mutual flag (Second User side):', m2shaped.mutual, '| counterpart:', m2shaped.mutualMeetupId === mm1.meetup.id);
  const upd = await localApi('/meetups/' + mm2.meetup.id + '/location', { method: 'POST', body: JSON.stringify({ location: 'FSM — Stade universitaire' }) });
  console.log('25. location update →', upd.meetup.location, '| flag:', upd.meetup.mutualLocationSet);
  const asTU2 = await localApi('/meetups');
  const m1after = asTU2.meetups.find((x) => x.id === mm1.meetup.id);
  console.log('   counterpart updated too:', m1after.location, '| flag:', m1after.mutualLocationSet);

  // person profile modal smoke test (real user, null rating path)
  await doLogin('Test User', 'testuser');
  await openPersonModal(tu2.id);
  console.log('26. person modal for real user: rendered without throwing');

  // one-sided yes → meet request → accept / decline
  await doLogin('Third User', 'thirduser');
  const d5 = new Date(Date.now() + 6 * 86400000);
  await doLogin('Test User', 'testuser');
  const req = await localApi('/people/' + getLocalDB().users['Third User'].id + '/meet', { method: 'POST', body: JSON.stringify({ location: 'FSM — Cafétéria centrale', date: d5.toISOString().slice(0, 10), time: '15:00' }) });
  console.log('27. one-sided yes → request created:', req.meetup.title, '| requestedFor:', req.meetup.requestedFor !== null);
  await doLogin('Third User', 'thirduser');
  const asThird = await localApi('/meetups');
  const reqForMe = asThird.meetups.find((x) => x.id === req.meetup.id);
  console.log('   requestedForMe for Third User:', reqForMe.requestedForMe, '| mutual:', reqForMe.mutual);
  const acc = await localApi('/meetups/' + req.meetup.id + '/accept', { method: 'POST', body: '{}' });
  console.log('   accept → mutual:', acc.meetup.mutual, '| participants:', acc.meetup.participants.length, '| requestedForMe:', acc.meetup.requestedForMe);
  await doLogin('Test User', 'testuser');
  const asTU3 = await localApi('/meetups');
  console.log('   organizer side sees mutual:', asTU3.meetups.find((x) => x.id === req.meetup.id).mutual);

  // decline case
  await doLogin('Fourth User', 'fourthuser');
  const d6 = new Date(Date.now() + 7 * 86400000);
  await doLogin('Test User', 'testuser');
  const req2 = await localApi('/people/' + getLocalDB().users['Fourth User'].id + '/meet', { method: 'POST', body: JSON.stringify({ location: 'Corniche de Monastir', date: d6.toISOString().slice(0, 10), time: '17:00' }) });
  await doLogin('Fourth User', 'fourthuser');
  const dec = await localApi('/meetups/' + req2.meetup.id + '/decline', { method: 'POST', body: '{}' });
  console.log('28. decline →', dec.ok, '| meetup gone for Fourth User:', !(await localApi('/meetups')).meetups.find((x) => x.id === req2.meetup.id));
  await doLogin('Test User', 'testuser');
  console.log('   meetup gone for organizer too:', !(await localApi('/meetups')).meetups.find((x) => x.id === req2.meetup.id));
})().catch((e) => { console.error('HARNESS FAILED:', e); process.exit(1); });
