/* ============================================================
   W.I.N.K — App logic
   People-first discovery (one person card → Yes → suggest venue),
   meetups + group chats, Instagram-style profiles, offline demo mode.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- state ---------- */
  const TOKEN_KEY = 'wink_token';
  const LS_KEY = 'wink_last_seen';

  /* safe storage — never crash the app if localStorage is blocked/full */
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const lsRemove = (k) => { try { localStorage.removeItem(k); } catch (e) {} };
  const lsGetJSON = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSetJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let token = lsGet(TOKEN_KEY);
  let user = null;
  let meta = { hobbies: [], venues: {}, seek: [] };
  let meetups = [];
  let filterVenue = 'all';
  let filterHobbies = [];
  let activeThreadId = null;
  let chats = {};
  let lastSeen = lsGetJSON(LS_KEY, {});
  let chatTimer = null;
  let pickerRating = 0;
  let profileTab = 'stories';
  let peopleQueue = [];
  let allPeople = [];
  let activeSuggest = null;
  const SEEN_KEY = 'wink_seen_people';
  let personSeen = new Set(lsGetJSON(SEEN_KEY, []));

  const STATE_KEY = 'wink_state';
  const state = lsGetJSON(STATE_KEY, null);

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hueVar = (u) => `--hue:${u.hue || '#D96A4A'}`;

  /* ---------- api ---------- */
  async function api(path, opts = {}) {
    if (localMode) return localApi(path, opts);
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers.Authorization = 'Bearer ' + token;
    let res;
    try {
      res = await fetch('/api' + path, { ...opts, headers });
    } catch (e) {
      const banner = $('#apiBanner');
      if (banner) banner.hidden = false;
      throw new Error('Network error — is the server running?');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  /* ---------- offline fallback (server unreachable → local demo) ---------- */
  const OFF_HOBBIES = [
    { id: 'football', label: 'Football', emoji: '⚽' },
    { id: 'basketball', label: 'Basketball', emoji: '🏀' },
    { id: 'gaming', label: 'Gaming', emoji: '🎮' },
    { id: 'music', label: 'Music', emoji: '🎸' },
    { id: 'cinema', label: 'Cinema', emoji: '🎬' },
    { id: 'reading', label: 'Reading', emoji: '📚' },
    { id: 'gym', label: 'Gym & fitness', emoji: '💪' },
    { id: 'cooking', label: 'Cooking', emoji: '🍳' },
    { id: 'anime', label: 'Anime', emoji: '🍥' },
    { id: 'hiking', label: 'Hiking', emoji: '🥾' },
    { id: 'drawing', label: 'Drawing & art', emoji: '🎨' },
    { id: 'photography', label: 'Photography', emoji: '📸' },
    { id: 'coding', label: 'Coding', emoji: '💻' },
    { id: 'travel', label: 'Travel', emoji: '🌍' },
    { id: 'coffee', label: 'Coffee & cafés', emoji: '☕' },
    { id: 'astronomy', label: 'Astronomy', emoji: '🔭' },
    { id: 'dance', label: 'Dance', emoji: '💃' },
    { id: 'study', label: 'Studying', emoji: '✏️' },
  ];
  const OFF_VENUES = {
    FSM: [
      'FSM — Amphithéâtre principal',
      'FSM — Bibliothèque universitaire',
      'FSM — Cafétéria centrale',
      'FSM — Stade universitaire',
      'FSM — Salle de sport',
      'FSM — Jardin des sciences',
    ],
    Monastir: [
      'Boulevard Habib Bourguiba',
      'Café de la Place',
      'Corniche de Monastir',
      'Marina de Monastir',
      'Plage de Skikda',
      'Centre culturel Tahar Haddad',
      'Port de pêche (Skanes)',
    ],
  };
  const OFF_SEEK = [
    'Friends to study with',
    'Friends to chill with',
    'Sports partner',
    'Creative collaborator',
    'Explore Monastir together',
    'Just someone to talk to',
  ];
  const OFF_POOL = [
    { name: 'Yasmine B.', hue: '#8A6B9E', initials: 'YB' },
    { name: 'Amine T.', hue: '#6E8B7C', initials: 'AT' },
    { name: 'Sofia K.', hue: '#BC527E', initials: 'SK' },
    { name: 'Hamza A.', hue: '#D9A441', initials: 'HA' },
    { name: 'Ines M.', hue: '#4F7A94', initials: 'IM' },
    { name: 'Karim R.', hue: '#C28A5C', initials: 'KR' },
    { name: 'Salma L.', hue: '#7C9466', initials: 'SL' },
    { name: 'Mohamed Amine S.', hue: '#D96A4A', initials: 'MS' },
  ];
  const offAt = (dayOffset, hour, min = 0) => { const d = new Date(); d.setHours(hour, min, 0, 0); return new Date(d.getTime() + dayOffset * 86400000); };
  const offPerson = (name) => OFF_POOL.find((p) => p.name === name);

  const OFF_PEOPLE = [
    { id: 'p1', name: 'Yasmine B.', handle: '@yasmine', hue: '#8A6B9E', initials: 'YB', instagram: 'yasmineb', photos: ['🎬', '📚', '🌅', '🎸', '🌊', '🏀'], bio: 'CS student who loves film nights and beach walks. Always up for a chat — never met a stranger.', hobbies: ['cinema', 'reading', 'travel', 'photography'], seek: 'Friends to chill with', rating: 4.8, meetsCount: 12, online: true },
    { id: 'p2', name: 'Amine T.', handle: '@amine', hue: '#6E8B7C', initials: 'AT', instagram: 'amine.t', photos: ['💻', '⚽', '🎮', '📚', '🌊', '🎵'], bio: 'Backend dev. Football on weekends, algorithms on weekdays. Will debate pizza toppings for hours.', hobbies: ['coding', 'football', 'gaming', 'study'], seek: 'Sports partner', rating: 4.6, meetsCount: 9, online: true },
    { id: 'p3', name: 'Sofia K.', handle: '@sofia', hue: '#BC527E', initials: 'SK', instagram: 'sofia.k', photos: ['📸', '🌅', '🎨', '🎬', '🍿', '🏖️'], bio: 'Photography student — sunset chaser and film grain lover. Looking for creative collaborators.', hobbies: ['photography', 'hiking', 'travel', 'drawing'], seek: 'Creative collaborator', rating: 4.9, meetsCount: 15, online: true },
    { id: 'p4', name: 'Hamza A.', handle: '@hamza', hue: '#D9A441', initials: 'HA', instagram: 'hamza.a', photos: ['⚽', '💪', '🏀', '🎮', '🍔', '🎵'], bio: 'Sports first, everything else second. Gym buddies welcome — all levels, no judgment.', hobbies: ['football', 'gym', 'basketball'], seek: 'Sports partner', rating: 4.5, meetsCount: 7, online: true },
    { id: 'p5', name: 'Ines M.', handle: '@ines', hue: '#4F7A94', initials: 'IM', instagram: 'ines.m', photos: ['📚', '✏️', '☕', '🎬', '🍩', '🌅'], bio: 'Study group regular and cinema club founder. Let’s ace this semester — and grab coffee after.', hobbies: ['study', 'cinema', 'coffee', 'reading'], seek: 'Friends to study with', rating: 4.7, meetsCount: 11, online: true },
    { id: 'p6', name: 'Karim R.', handle: '@karim', hue: '#C28A5C', initials: 'KR', instagram: 'karim.r', photos: ['🎮', '💻', '🕹️', '☕', '🎸', '🌃'], bio: 'Gaming nights and guitar riffs. Shy but friendly — say hi, I promise I bite less than my avatar.', hobbies: ['gaming', 'music', 'coding', 'coffee'], seek: 'Just someone to talk to', rating: 4.4, meetsCount: 6, online: true },
    { id: 'p7', name: 'Salma L.', handle: '@salma', hue: '#7C9466', initials: 'SL', instagram: 'salma.l', photos: ['🥾', '🌊', '🏐', '📸', '🍦', '🌅'], bio: 'Beach days and trail walks. New in Monastir — show me your favorite corner of the Corniche?', hobbies: ['hiking', 'travel', 'football', 'photography'], seek: 'Explore Monastir together', rating: 4.8, meetsCount: 10, online: true },
    { id: 'p8', name: 'Mohamed Amine S.', handle: '@amines', hue: '#D96A4A', initials: 'MS', instagram: 'amine.s', photos: ['💪', '⚽', '📚', '🎵', '🏊', '🍽️'], bio: 'Med student. Gym at 6am, then books all day. Looking for study buddies who fuel up properly.', hobbies: ['gym', 'football', 'study', 'music'], seek: 'Friends to study with', rating: 4.6, meetsCount: 8, online: true },
  ];
  function offSuggestVenue(person) {
    const map = {
      football: 'FSM — Stade universitaire',
      basketball: 'FSM — Stade universitaire',
      gym: 'FSM — Salle de sport',
      study: 'FSM — Bibliothèque universitaire',
      coding: 'FSM — Bibliothèque universitaire',
      reading: 'FSM — Bibliothèque universitaire',
      coffee: 'FSM — Cafétéria centrale',
      gaming: 'FSM — Cafétéria centrale',
      anime: 'Café de la Place',
      cooking: 'Café de la Place',
      photography: 'Corniche de Monastir',
      hiking: 'Corniche de Monastir',
      astronomy: 'Corniche de Monastir',
      travel: 'Marina de Monastir',
      music: 'Marina de Monastir',
      dance: 'Marina de Monastir',
      cinema: 'Centre culturel Tahar Haddad',
      drawing: 'Centre culturel Tahar Haddad',
    };
    for (const h of (person.hobbies || [])) if (map[h]) return map[h];
    return 'FSM — Cafétéria centrale';
  }
  function offShapePerson(p, user, meets) {
    return {
      id: p.id, name: p.name, handle: p.handle, hue: p.hue, initials: p.initials,
      instagram: p.instagram || '',
      photos: p.photos, bio: p.bio, hobbies: p.hobbies, seek: p.seek,
      rating: p.rating, meetsCount: p.meetsCount,
      online: p.online === true,
      suggestedVenue: offSuggestVenue(p),
      ...(meets ? { meets } : {}),
    };
  }

  function offShapeUser(u, user) {
    const hostedMeets = localDB.meetups.filter((m) => m.organizer && m.organizer.userId === u.id);
    const hosted = hostedMeets.filter((m) => m.reviews.length);
    const rating = hosted.length ? hosted.reduce((a, m) => a + m.reviews.reduce((s, r) => s + r.rating, 0) / m.reviews.length, 0) / hosted.length : null;
    const meetsCount = hostedMeets.length;
    return {
    id: u.id, name: u.name, handle: u.handle, hue: u.hue, initials: u.initials,
    instagram: u.instagram || '',
    photos: u.photos, bio: u.bio || 'New on W.I.N.K — say hi!', hobbies: u.hobbies || [], seek: u.seek || '',
      rating, meetsCount,
      online: offIsOnline(u),
      suggestedVenue: offSuggestVenue(u),
      meets: hostedMeets.slice(0, 3).map((m) => localShape(m, user)),
    };
  }

  const OFF_ONLINE_WINDOW = 5 * 60 * 1000; // 5 minutes
  function offIsOnline(u) {
    if (!u) return false;
    if (u.online === true) return true;
    return u.lastSeen && Date.now() - u.lastSeen < OFF_ONLINE_WINDOW;
  }

  function offSeed() {
    const rev = (name, rating, comment, off, hour, min) => { const p = offPerson(name); return { authorName: name, initials: p.initials, hue: p.hue, rating, comment, date: offAt(off, hour, min).toISOString() }; };
    const com = (name, text, off, hour, min) => { const p = offPerson(name); return { authorName: name, initials: p.initials, hue: p.hue, text, date: offAt(off, hour, min).toISOString() }; };
    const mk = (id, title, desc, hobbies, venueGroup, location, off, hour, min, cap, org, parts, reviews, comments) => ({
      id, title, desc, hobbies, venueGroup, location,
      date: offAt(off, hour, min).toISOString(),
      time: String(hour).padStart(2, '0') + ':' + String(min || 0).padStart(2, '0'),
      capacity: cap,
      organizer: { ...offPerson(org), userId: null },
      participants: parts.map((n) => ({ ...offPerson(n), userId: null })),
      reviews: reviews || [],
      comments: comments || [],
      createdByUser: false,
      createdAt: new Date(offAt(off, hour, min).getTime() - 3600000).toISOString(),
    });
    const meetups = [
      mk('m1', 'Distributed Systems study session', 'Exam prep group. We split the chapters, solve past papers together, and take a coffee break at 16:30.', ['coding', 'study', 'coffee'], 'FSM', 'FSM — Bibliothèque universitaire', 1, 14, 0, 4, 'Amine T.', ['Amine T.', 'Yasmine B.', 'Karim R.'], [], [
        com('Yasmine B.', 'Past papers are in the shared folder 👇', 0, 10, 0),
        com('Amine T.', 'Thanks! See you at 14:00 📚', 0, 11, 0),
      ]),
      mk('m2', 'Football 5v5 — student pitch', 'Casual match, good vibes. Bring boots, water and a friend (or meet one there).', ['football', 'gym'], 'FSM', 'FSM — Stade universitaire', 0, 17, 0, 10, 'Hamza A.', ['Hamza A.', 'Ines M.', 'Salma L.', 'Mohamed Amine S.', 'Sofia K.'], [], []),
      mk('m3', 'Corniche walk & sunset photos', 'Easy walk along the Corniche + a small photo tour. Great for meeting people without pressure.', ['photography', 'hiking', 'travel'], 'Monastir', 'Corniche de Monastir', 0, 18, 30, 6, 'Sofia K.', ['Sofia K.', 'Yasmine B.'], [], [
        com('Sofia K.', 'Sunset is at 18:40 — perfect timing 🌅', 0, 12, 0),
      ]),
      mk('m4', 'Game night — Mario Kart & snacks', 'Chill evening, consoles provided. No skills needed, just laughs.', ['gaming', 'anime', 'coffee'], 'Monastir', 'Café de la Place', 2, 19, 30, 6, 'Karim R.', ['Karim R.', 'Amine T.', 'Hamza A.'], [], []),
      mk('m5', 'Cinema club — screening + debate', 'We vote on a film on the day, watch it, then debate over tea.', ['cinema', 'reading'], 'Monastir', 'Centre culturel Tahar Haddad', 2, 20, 0, 8, 'Ines M.', ['Ines M.', 'Salma L.', 'Yasmine B.', 'Sofia K.'], [], []),
      mk('m6', 'Gym buddies — push day', 'Bench, shoulders, arms. Spotters guaranteed. All levels welcome.', ['gym', 'football'], 'FSM', 'FSM — Salle de sport', 3, 17, 0, 4, 'Mohamed Amine S.', ['Mohamed Amine S.', 'Amine T.'], [], []),
      mk('m7', 'Skikda beach frisbee afternoon', 'Frisbee, sea breeze, maybe a swim. Meet at the entrance and walk down together.', ['hiking', 'travel', 'football'], 'Monastir', 'Plage de Skikda', 3, 15, 0, 8, 'Salma L.', ['Salma L.', 'Sofia K.', 'Ines M.', 'Yasmine B.'], [], []),
      mk('m8', 'Music jam — guitar & keyboards', 'Bring any instrument or just listen. We play everything from govà to rock.', ['music', 'coffee'], 'Monastir', 'Marina de Monastir', 4, 19, 0, 5, 'Yasmine B.', ['Yasmine B.', 'Sofia K.', 'Karim R.'], [], []),
      mk('m9', 'Algorithms deep dive', 'Sorting, DP and greedy — we covered past-paper problems for 2 hours.', ['coding', 'study'], 'FSM', 'FSM — Bibliothèque universitaire', -1, 14, 0, 4, 'Amine T.', ['Amine T.', 'Yasmine B.', 'Karim R.'], [
        rev('Yasmine B.', 5, 'So helpful! Met 2 people here, we now study together every week. 💛', -1, 18, 0),
        rev('Karim R.', 5, 'Clear explanations and a small group — perfect for a first meet.', -1, 19, 0),
      ], [
        com('Karim R.', 'Great session! When is the next one?', -1, 15, 0),
        com('Amine T.', 'Same time next week 💪', -1, 15, 30),
      ]),
      mk('m10', 'First hello: coffee & chats', 'Small-group icebreaker meet. We played a game of "two truths, one lie".', ['coffee', 'cinema'], 'Monastir', 'Café de la Place', -3, 17, 0, 6, 'Ines M.', ['Ines M.', 'Hamza A.', 'Yasmine B.'], [
        rev('Hamza A.', 4, 'Nice vibe, small group felt safe. Would join again.', -3, 18, 30),
        rev('Sofia K.', 5, 'Came alone, left with 3 new contacts. 10/10.', -3, 19, 0),
      ], []),
      mk('m11', 'Café math — past papers & coffee', 'Bring your hardest problems — we solve them together over coffee from the cafétéria.', ['study', 'coffee'], 'FSM', 'FSM — Cafétéria centrale', 1, 15, 30, 6, 'Hamza A.', ['Hamza A.', 'Amine T.', 'Karim R.'], [], [
        com('Amine T.', 'The calculus problems were brutal — see you all there ☕', 0, 9, 0),
      ]),
      mk('m12', 'English corner — Friday chats', 'Casual English conversation for everyone. Topics on the board, newcomers welcome.', ['reading', 'coffee'], 'FSM', 'FSM — Jardin des sciences', 3, 16, 0, 6, 'Salma L.', ['Salma L.', 'Sofia K.', 'Yasmine B.'], [], [
        com('Salma L.', 'New topic every Friday — this week: travel stories in English 🌍', 2, 10, 0),
      ]),
      mk('m13', 'Board game night — cafétéria tables', 'Splendor, Ticket to Ride, Carcassonne… boards provided, just bring your friends (or make new ones).', ['gaming', 'coffee'], 'FSM', 'FSM — Cafétéria centrale', 2, 19, 30, 8, 'Sofia K.', ['Sofia K.', 'Karim R.', 'Mohamed Amine S.'], [], [
        com('Karim R.', 'Bringing Splendor and Ticket to Ride 🎲', 1, 20, 0),
      ]),
    ];
    const chats = {};
    const offMsg = (m, extra) => ({ id: newLocalId('msg'), kind: 'text', date: extra.date, authorName: extra.authorName, initials: extra.initials, hue: extra.hue, text: extra.text });
    meetups.forEach((m) => {
      chats[m.id] = [{
        id: newLocalId('msg'),
        authorName: m.organizer.name,
        initials: m.organizer.initials,
        hue: m.organizer.hue,
        text: 'Hey! 👋 Welcome to "' + m.title + '". We meet at ' + m.location + ' at ' + m.time + '.',
        kind: 'text',
        date: new Date(new Date(m.date).getTime() - 3600000).toISOString(),
      }];
    });
    const seedChat = (id, hr, name, text) => chats[id].push(offMsg(null, { date: new Date(Date.now() - hr * 3600000), authorName: name, initials: offPerson(name).initials, hue: offPerson(name).hue, text }));
    seedChat('m1', 5, 'Yasmine B.', "I'll bring the past papers 📚");
    seedChat('m1', 2, 'Karim R.', 'Save me a seat 🧑💻');
    seedChat('m3', 3, 'Sofia K.', 'Camera ready 📸');
    seedChat('m9', 27, 'Yasmine B.', 'That DP problem broke my brain 🤯');
    seedChat('m9', 26, 'Amine T.', 'We cracked it! Next time: greedy algorithms 💪');
    return { users: {}, sessions: {}, meetups, chats };
  }

  const LS_DB = 'wink_local_db';
  let localMode = false;
  let localDB = null;
  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_DB);
      if (raw) { localDB = JSON.parse(raw); return true; }
    } catch (e) {}
    localDB = null;
    return false;
  }
  function seedLocal() { localDB = offSeed(); persistLocal(); }
  function persistLocal() { try { localStorage.setItem(LS_DB, JSON.stringify(localDB)); } catch (e) {} }
  const localUser = () => {
    if (!token || !localDB) return null;
    const name = localDB.sessions[token];
    return name ? normUser(localDB.users[name]) || null : null;
  };
  const newLocalId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function localShape(m, user) {
    const ended = new Date(m.date) < new Date();
    const match = user && user.hobbies && user.hobbies.length
      ? Math.round((m.hobbies.filter((t) => user.hobbies.includes(t)).length / m.hobbies.length) * 100) : null;
    const joinedByMe = !!(user && m.participants.some((p) => p.userId === user.id));
    const avg = m.reviews.length ? m.reviews.reduce((a, r) => a + r.rating, 0) / m.reviews.length : null;
    const cp = mutualCounterpart(m, user, localDB.meetups);
    return {
      id: m.id, title: m.title, desc: m.desc, hobbies: m.hobbies, venueGroup: m.venueGroup,
      location: m.location, date: m.date, time: m.time, capacity: m.capacity,
      organizer: m.organizer, participants: m.participants, reviews: m.reviews,
      comments: m.comments || [], createdByUser: m.createdByUser, createdAt: m.createdAt,
      status: ended ? 'ended' : 'upcoming', match, joinedByMe, avgRating: avg,
      mutual: !!cp, mutualMeetupId: cp ? cp.id : null, mutualLocationSet: !!m.mutualLocationSet,
      requestedForMe: !!(user && m.organizer && m.organizer.userId === user.id && !joinedByMe
        && m.title === 'Meetup with ' + user.name),
    };
  }

  async function localApi(path, opts = {}) {
    const [pure, qs] = String(path).split('?');
    const params = new URLSearchParams(qs || '');
    const body = opts.body ? JSON.parse(opts.body || '{}') : {};
    const segs = pure.split('/').filter(Boolean);
    const fail = (msg) => { throw new Error(msg); };
    const me = localUser();
    if (me) me.lastSeen = Date.now(); // presence — every local API call keeps you online

    if (segs[0] === 'meta') return { hobbies: OFF_HOBBIES, venues: OFF_VENUES, seek: OFF_SEEK };

    if (segs[0] === 'login') {
      const name = String(body.name || '').trim();
      if (!name) fail('Please enter your name');
      const ig = String(body.instagram || '').trim().replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 30);
      if (ig && !/^[A-Za-z0-9._-]+$/.test(ig)) fail('Invalid Instagram handle');
      // one account per Instagram — the handle is the account key; legacy accounts can still sign in by name
      let user = ig ? Object.values(localDB.users).find((u) => u.instagram && u.instagram.toLowerCase() === ig.toLowerCase()) : null;
      if (!user) user = localDB.users[name]; // legacy name fallback
      if (!user) {
        if (!ig) fail('Please enter your @instagram');
        const words = name.split(/\s+/);
        user = {
          id: newLocalId('u'), name,
          initials: (((words[0] || 'W')[0] || '') + ((words[1] || '')[0] || '')).toUpperCase(),
          handle: '', // @instagram is set at login — never derived from the name
          instagram: ig,
          hue: OFF_POOL[Object.keys(localDB.users).length % OFF_POOL.length].hue,
          bio: '', hobbies: [], seek: '',
          photos: ['📚', '🌅', '🎸', '🏀', '🎬', '🌊'].sort(() => Math.random() - 0.5),
          createdAt: new Date().toISOString(),
        };
        localDB.users[name] = user;
        persistLocal();
      } else {
        if (!user.instagram && ig) user.instagram = ig; // legacy account claims its handle
      }
      user.lastSeen = Date.now(); // signing in puts you online
      const tok = newLocalId('t');
      localDB.sessions[tok] = name;
      persistLocal();
      return { token: tok, user: normUser(user) };
    }
    if (segs[0] === 'me') { if (!me) fail('Not signed in'); return { user: normUser(me) }; }

    if (segs[0] === 'onboard') {
      if (!me) fail('Not signed in');
      me.hobbies = Array.isArray(body.hobbies) ? body.hobbies.slice(0, 12) : [];
      me.seek = String(body.seek || me.seek || '');
      me.bio = String(body.bio || '').slice(0, 80);
      me.instagram = String(body.instagram || '').trim().replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 30);
      if (Array.isArray(body.photos)) me.photos = body.photos.slice(0, 6);
      persistLocal();
      return { user: me };
    }

    if (segs[0] === 'profile' && segs[1] === 'instagram') {
      if (!me) fail('Not signed in');
      const ig = String(body.instagram || '').trim().replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 30);
      if (ig && ig.toLowerCase() !== (me.instagram || '').toLowerCase()) {
        // one account per Instagram — the handle can't belong to two accounts
        const taken = Object.values(localDB.users).some((x) => x.id !== me.id && x.instagram && x.instagram.toLowerCase() === ig.toLowerCase());
        if (taken) fail('That @instagram is already taken — one account per instagram');
      }
      me.instagram = ig;
      persistLocal();
      return { user: me };
    }

    if (segs[0] === 'meetups') {
      if (segs.length === 1) {
        if (opts.method === 'POST') {
          if (!me) fail('Not signed in');
          const title = String(body.title || '').trim();
          if (!title) fail('Give your meet a title');
          const hobbies = Array.isArray(body.hobbies) ? body.hobbies.filter((t) => OFF_HOBBIES.some((h) => h.id === t)) : [];
          if (!hobbies.length) fail('Pick at least one hobby');
          const location = String(body.location || '').trim();
          if (!location) fail('Pick a place');
          if (!body.date || !body.time) fail('Pick a date and time');
          const dt = new Date(body.date + 'T' + body.time);
          if (isNaN(dt.getTime())) fail('Pick a valid date and time');
          const venueGroup = Object.keys(OFF_VENUES).find((g) => OFF_VENUES[g].includes(location)) || 'Monastir';
          const m = {
            id: newLocalId('m'), title,
            desc: String(body.desc || '').trim() || 'Come as you are — new faces welcome.',
            hobbies, venueGroup, location,
            date: dt.toISOString(), time: body.time,
            capacity: Math.min(12, Math.max(2, Number(body.capacity) || 6)),
            organizer: { name: me.name, initials: me.initials, hue: me.hue, userId: me.id },
            participants: [{ name: me.name, initials: me.initials, hue: me.hue, userId: me.id }],
            reviews: [], comments: [],
            createdAt: new Date().toISOString(), createdByUser: true,
          };
          localDB.meetups.unshift(m);
          if (!localDB.chats[m.id]) localDB.chats[m.id] = [];
          persistLocal();
          return { meetup: localShape(m, me) };
        }
        const q = (params.get('q') || '').toLowerCase();
        const venue = params.get('venue') || 'all';
        const sort = params.get('sort') || 'match';
        const hobby = (params.get('hobby') || '').split(',').filter(Boolean);
        let list = localDB.meetups.filter((m) => {
          if (venue !== 'all' && m.venueGroup !== venue) return false;
          if (hobby.length && !m.hobbies.some((t) => hobby.includes(t))) return false;
          if (q) {
            const hay = (m.title + ' ' + m.desc + ' ' + m.location + ' ' + m.hobbies.join(' ')).toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });
        if (sort === 'match') list.sort((a, b) => (localShape(b, me).match || 0) - (localShape(a, me).match || 0));
        else if (sort === 'soon') list.sort((a, b) => new Date(a.date) - new Date(b.date));
        else if (sort === 'top') list.sort((a, b) => (localShape(b, me).avgRating || 0) - (localShape(a, me).avgRating || 0));
        return { meetups: list.map((m) => localShape(m, me)) };
      }
      const id = segs[1];
      const m = localDB.meetups.find((x) => x.id === id);
      if (!m) fail('Meetup not found');
      const act = segs[2];
      if (act === 'join') {
        if (!me) fail('Not signed in');
        if (!m.participants.some((p) => p.userId === me.id)) m.participants.push({ name: me.name, initials: me.initials, hue: me.hue, userId: me.id });
        if (!localDB.chats[m.id]) localDB.chats[m.id] = [];
        persistLocal();
        return { meetup: localShape(m, me) };
      }
      if (act === 'leave') {
        if (!me) fail('Not signed in');
        if (!m.participants.some((p) => p.userId === me.id)) fail('You are not in this meet');
        m.participants = m.participants.filter((p) => p.userId !== me.id);
        persistLocal();
        return { meetup: localShape(m, me) };
      }
      if (act === 'accept') {
        if (!me) fail('Not signed in');
        const isTarget = m.organizer && m.organizer.userId === me.id
          && m.title === 'Meetup with ' + me.name;
        if (!isTarget) fail('This meetup was not requested for you');
        if (m.participants.some((p) => p.userId === me.id)) fail('You are already part of this meet');
        if (m.participants.length >= m.capacity) fail('This meet is full');
        m.participants.push({ name: me.name, initials: me.initials, hue: me.hue, userId: me.id });
        m.requestedFor = null;
        m.mutual = true;
        persistLocal();
        return { meetup: localShape(m, me) };
      }
      if (act === 'decline') {
        if (!me) fail('Not signed in');
        const isTarget = m.organizer && m.organizer.userId === me.id
          && m.title === 'Meetup with ' + me.name;
        if (!isTarget) fail('This meetup was not requested for you');
        localDB.meetups = localDB.meetups.filter((x) => x.id !== id);
        delete localDB.chats[id];
        persistLocal();
        return { ok: true };
      }
      if (act === 'review') {
        if (!me) fail('Not signed in');
        if (!m.participants.some((p) => p.userId === me.id)) fail('Only participants can review this meet');
        const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5)));
        const comment = String(body.comment || '').trim().slice(0, 300) || 'Nice meet, thanks!';
        m.reviews.push({ authorName: me.name, initials: me.initials, hue: me.hue, rating, comment, date: new Date().toISOString() });
        persistLocal();
        return { meetup: localShape(m, me) };
      }
      if (act === 'comments') {
        if (!me) fail('Not signed in');
        if (!m.participants.some((p) => p.userId === me.id)) fail('Only participants can comment on this meet');
        const text = String(body.text || '').trim().slice(0, 500);
        if (!text) fail('Write something first');
        m.comments = m.comments || [];
        m.comments.push({ authorName: me.name, initials: me.initials, hue: me.hue, text, date: new Date().toISOString() });
        persistLocal();
        return { meetup: localShape(m, me) };
      }
      if (act === 'again') {
        if (!me) fail('Not signed in');
        if (!m.participants.some((p) => p.userId === me.id)) fail('Only participants can schedule a round 2');
        const again = {
          id: newLocalId('m'),
          title: m.title + ' — Round 2',
          desc: 'Same vibe, new date. We loved the last meet — join us again!',
          hobbies: [...m.hobbies], venueGroup: m.venueGroup, location: m.location,
          date: new Date(new Date(m.date).getTime() + 7 * 86400000).toISOString(),
          time: m.time, capacity: m.capacity,
          organizer: { ...m.organizer },
          participants: m.participants.map((p) => ({ ...p })),
          reviews: [], comments: [],
          createdAt: new Date().toISOString(), createdByUser: true,
        };
        if (!again.participants.some((p) => p.userId === me.id)) again.participants.unshift({ name: me.name, initials: me.initials, hue: me.hue, userId: me.id });
        localDB.meetups.unshift(again);
        localDB.chats[again.id] = [];
        persistLocal();
        return { meetup: localShape(again, me) };
      }
      if (act === 'location') {
        if (!me) fail('Not signed in');
        const location = String(body.location || '').trim();
        if (!location) fail('Pick a place');
        m.location = location;
        m.venueGroup = Object.keys(OFF_VENUES).find((g) => OFF_VENUES[g].includes(location)) || 'FSM';
        m.mutualLocationSet = true;
        const cp = mutualCounterpart(m, me, localDB.meetups);
        if (cp) { cp.location = location; cp.venueGroup = m.venueGroup; cp.mutualLocationSet = true; }
        persistLocal();
        return { meetup: localShape(m, me) };
      }
    }

    if (segs[0] === 'people') {
      if (segs.length === 1) {
        const others = Object.values(localDB.users).filter((x) => !me || x.id !== me.id).map((x) => offShapeUser(x, me));
        // only people who are online right now
        return { people: OFF_PEOPLE.map((p) => offShapePerson(p, me)).concat(others).filter((p) => p.online) };
      }
      const seeded = OFF_PEOPLE.find((x) => x.id === segs[1]);
      const p = seeded || Object.values(localDB.users).find((x) => x.id === segs[1]);
      if (!p) fail('Person not found');
      if (segs[2] === 'meet') {
        const location = String(body.location || '').trim();
        if (!location) fail('Pick a place');
        if (!body.date || !body.time) fail('Pick a date and time');
        const dt = new Date(body.date + 'T' + body.time);
        if (isNaN(dt.getTime())) fail('Pick a valid date and time');
        const dup = localDB.meetups.find((m) => m.title === 'Meetup with ' + p.name && m.participants.some((x) => x.userId === me.id) && new Date(m.date) >= new Date());
        if (dup) return { meetup: localShape(dup, me) };
        const m = {
          id: newLocalId('m'),
          title: 'Meetup with ' + p.name,
          desc: p.seek ? 'Connected on W.I.N.K — ' + p.seek + '. Say hi in the chat!' : 'Connected on W.I.N.K — say hi in the chat!',
          hobbies: (p.hobbies || []).slice(0, 2),
          venueGroup: Object.keys(OFF_VENUES).find((g) => OFF_VENUES[g].includes(location)) || 'Monastir',
          location,
          date: dt.toISOString(),
          time: body.time,
          capacity: 4,
          organizer: { name: p.name, initials: p.initials, hue: p.hue, userId: seeded ? null : p.id },
          participants: [{ name: me.name, initials: me.initials, hue: me.hue, userId: me.id }],
          reviews: [], comments: [],
          createdAt: new Date().toISOString(),
          createdByUser: true,
          requestedFor: null,
        };
        // if the other side already said yes, the meetup is mutual — no pending request
        if (!mutualCounterpart(m, me, localDB.meetups)) m.requestedFor = seeded ? null : p.id;
        localDB.meetups.unshift(m);
        const welcome = mutualCounterpart(m, me, localDB.meetups)
          ? { authorName: p.name, initials: p.initials, hue: p.hue, text: 'Hey! 👋 So excited — see you at ' + location + ' at ' + body.time + '!' }
          : { authorName: me.name, initials: me.initials, hue: me.hue, text: "Hey! 👋 I'd love to meet you — see you at " + location + " at " + body.time + "!" };
        localDB.chats[m.id] = [{ id: newLocalId('msg'), kind: 'text', date: new Date().toISOString(), ...welcome }];
        persistLocal();
        return { meetup: localShape(m, me) };
      }
      const meets = localDB.meetups.filter((m) => m.organizer.name === p.name).slice(0, 3).map((m) => localShape(m, me));
      return { person: seeded ? offShapePerson(p, me, meets) : offShapeUser(p, me) };
    }

    if (segs[0] === 'chats' && segs[1]) {
      if (!me) fail('Not signed in');
      const id = segs[1];
      if (!localDB.meetups.find((x) => x.id === id)) fail('Meetup not found');
      if (segs[2] === 'messages') {
        const msg = { id: newLocalId('msg'), authorName: me.name, initials: me.initials, hue: me.hue, date: new Date().toISOString() };
        if (body.kind === 'location') {
          msg.kind = 'location';
          msg.location = String(body.location || '').slice(0, 120);
          msg.time = String(body.time || '').slice(0, 8);
          msg.note = String(body.note || '').slice(0, 140);
          if (!msg.location) fail('Pick a place to send');
        } else {
          msg.kind = 'text';
          msg.text = String(body.text || '').trim().slice(0, 500);
          if (!msg.text) fail('Write something first');
        }
        if (!localDB.chats[id]) localDB.chats[id] = [];
        localDB.chats[id].push(msg);
        persistLocal();
        return { message: msg };
      }
      return { messages: localDB.chats[id] || [] };
    }
    fail('Unknown API route');
  }

  function toast(msg, type) {
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(20px)'; el.style.transition = 'all .3s'; }, 2600);
    setTimeout(() => el.remove(), 3000);
  }
  window.addEventListener('error', (e) => toast('⚠️ ' + e.message, 'err'));
  window.addEventListener('unhandledrejection', (e) => toast('⚠️ ' + ((e.reason && e.reason.message) || e.reason), 'err'));

  /* ---------- helpers ---------- */
  function avatarHTML(u, cls) {
    return `<span class="avatar ${cls || ''}" style="${hueVar(u)}">${esc(u.initials || '?')}</span>`;
  }
  function ringHTML(u, cls) {
    return `<span class="story-ring ${cls || ''}">${avatarHTML(u)}</span>`;
  }
  function starsHTML(rating) {
    let out = '';
    for (let i = 1; i <= 5; i++) out += i <= Math.round(rating) ? '★' : '<span class="empty">★</span>';
    return `<span class="stars">${out}</span>`;
  }
  function hobbyById(id) { return meta.hobbies.find((h) => h.id === id); }
  function isEnded(m) { return m.status === 'ended'; }
  function relTime(iso) {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 86400000;
    if (diff < 0) return 'soon';
    if (diff < 1) return 'today';
    if (diff < 2) return 'yesterday';
    if (diff < 7) return Math.floor(diff) + 'd ago';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  function dateLabel(m) {
    const d = new Date(m.date);
    const now = new Date();
    const t = new Date(now.getTime() + 86400000);
    const y = new Date(now.getTime() - 86400000);
    let day;
    if (d.toDateString() === now.toDateString()) day = 'Today';
    else if (d.toDateString() === t.toDateString()) day = 'Tomorrow';
    else if (d.toDateString() === y.toDateString()) day = 'Yesterday';
    else day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return day + ' · ' + m.time;
  }

  /* media art per hobby — warm, soft palette */
  const MEDIA_THEMES = {
    coding: { g: 'linear-gradient(135deg,#C2567E,#E07A52)', e: '💻', s: '⌨️' },
    study: { g: 'linear-gradient(135deg,#8A6B9E,#BC527E)', e: '📚', s: '✏️' },
    reading: { g: 'linear-gradient(135deg,#8A6B9E,#6E8B7C)', e: '📚', s: '📖' },
    football: { g: 'linear-gradient(135deg,#6E8B7C,#4F7A94)', e: '⚽', s: '🏟️' },
    gym: { g: 'linear-gradient(135deg,#C28A5C,#D96A4A)', e: '🏋️', s: '💪' },
    basketball: { g: 'linear-gradient(135deg,#D9A441,#C28A5C)', e: '🏀', s: '🏟️' },
    gaming: { g: 'linear-gradient(135deg,#8A6B9E,#4F7A94)', e: '🎮', s: '🕹️' },
    anime: { g: 'linear-gradient(135deg,#BC527E,#8A6B9E)', e: '🍥', s: '🌸' },
    music: { g: 'linear-gradient(135deg,#E7A86A,#D96A4A)', e: '🎸', s: '🎵' },
    cinema: { g: 'linear-gradient(135deg,#4F7A94,#6E8B7C)', e: '🎬', s: '🍿' },
    photography: { g: 'linear-gradient(135deg,#E7A86A,#D9A441)', e: '📸', s: '🌅' },
    hiking: { g: 'linear-gradient(135deg,#6E8B7C,#7C9466)', e: '🥾', s: '🌲' },
    travel: { g: 'linear-gradient(135deg,#4F7A94,#6E8B7C)', e: '🌍', s: '✈️' },
    coffee: { g: 'linear-gradient(135deg,#C28A5C,#8A6B9E)', e: '☕', s: '🥐' },
    cooking: { g: 'linear-gradient(135deg,#D96A4A,#D9A441)', e: '🍳', s: '🌶️' },
    dance: { g: 'linear-gradient(135deg,#BC527E,#E7A86A)', e: '💃', s: '🎶' },
    astronomy: { g: 'linear-gradient(135deg,#8A6B9E,#4F7A94)', e: '🔭', s: '🌌' },
    drawing: { g: 'linear-gradient(135deg,#BC527E,#D9A441)', e: '🎨', s: '🖌️' },
  };
  function mediaHTML(m) {
    const key = m.hobbies.find((t) => MEDIA_THEMES[t]) || 'travel';
    const t = MEDIA_THEMES[key];
    return `<div class="post-media" data-id="${m.id}">
      <span class="media-emoji">${t.e}</span>
      <span class="media-emoji small">${t.s}</span>
      <div class="media-loc">📍 ${esc(m.location)}</div>
      <div class="media-date">🕐 ${esc(dateLabel(m))}</div>
    </div>`;
  }

  /* ---------- auth ---------- */
  async function boot() {
    wireStatic();
    try {
      meta = await api('/meta');
      if (!meta || !Array.isArray(meta.hobbies)) throw new Error('bad response');
    } catch (e) {
      // server unreachable → offline demo mode (everything works, saved in this browser)
      localMode = true;
      $('#apiBanner').hidden = true;
      if (!loadLocal()) seedLocal();
      try { meta = await localApi('/meta'); } catch (e2) {}
      toast('📴 Server offline — offline demo mode (data saved in this browser)', 'warn');
    }
    renderChipsRow();
    // shared venue suggestions for the free-text place inputs
    $('#venueList').innerHTML = Object.values(meta.venues).flat().map((v) => `<option value="${esc(v)}"></option>`).join('');

    if (token) {
      try { user = normUser((await api('/me')).user); }
      catch (e) { token = null; lsRemove(TOKEN_KEY); }
    }
    if (user) {
      if (user.hobbies.length >= 2 && user.photos.length) enterApp();
      else showProfileSetup();
    } else {
      $('#loginOverlay').classList.add('show');
    }
  }

  function normUser(u) {
    if (!u) return u;
    const defPhotos = ['📚', '🌅', '🎸', '🏀', '🎬', '🌊'];
    if (!Array.isArray(u.hobbies)) u.hobbies = [];
    if (!Array.isArray(u.photos)) u.photos = defPhotos.slice();
    if (u.photos.length > 6) u.photos = u.photos.slice(0, 6);
    if (typeof u.seek !== 'string') u.seek = '';
    if (typeof u.bio !== 'string') u.bio = '';
    if (!u.handle) {
      const words = String(u.name || '').split(/\s+/);
      u.handle = '@' + (words[0] || 'wink').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || '@wink';
    }
    return u;
  }

  function afterLogin(d) {
    token = d.token;
    lsSet(TOKEN_KEY, token);
    user = normUser(d.user);
    $('#loginOverlay').classList.remove('show');
    if (user.hobbies && user.hobbies.length >= 2) enterApp();
    else showProfileSetup();
  }

  async function doLogin(name, instagram) {
    try {
      const d = await api('/login', { method: 'POST', body: JSON.stringify({ name, instagram }) });
      if (!d || !d.token) throw new Error('Sign-in failed — please try again');
      afterLogin(d);
    } catch (e) {
      // server gone after page load → switch to offline demo mode and retry
      if (!localMode && /Network error|Request failed|bad response/.test(e.message)) {
        localMode = true;
        $('#apiBanner').hidden = true;
        if (!loadLocal()) seedLocal();
        try {
          const d2 = await localApi('/login', { method: 'POST', body: JSON.stringify({ name, instagram }) });
          if (d2 && d2.token) { afterLogin(d2); return; }
          throw new Error('Sign-in failed — please try again');
        } catch (e2) { toast(e2.message, 'err'); return; }
      }
      toast(e.message, 'err');
    }
  }

  /* photo palette for the profile setup */
  const PHOTO_PALETTE = ['🎬', '📚', '🌅', '🎸', '🌊', '🏀', '🎮', '⚽', '☕', '🎨', '📸', '🎵', '💻', '🥾', '🍥', '🔭', '🏋️', '🌸', '🍿', '🍔', '🏖️', '🏐', '✏️', '🍽️', '💃', '🐱', '🌃', '🍩', '🎲', '🚴'];
  let setupPhotos = [];
  let hobbyTags = [];

  const normHobby = (h) => String(h || '').trim().toLowerCase().replace(/,$/, '');

  function renderHobbyTags() {
    $('#psHobbiesTags').innerHTML = hobbyTags.map((t, i) =>
      `<span class="chip tag-chip">${esc(t)} <button type="button" class="tag-x" data-idx="${i}" aria-label="Remove">✕</button></span>`).join('');
  }

  function addHobbyTag(raw) {
    const t = normHobby(raw);
    if (!t) return;
    if (t.length > 24) { toast('Keep each hobby short', 'warn'); return; }
    if (hobbyTags.includes(t)) { $('#psHobbiesInput').value = ''; return; }
    if (hobbyTags.length >= 12) { toast('Max 12 hobbies', 'warn'); return; }
    hobbyTags.push(t);
    renderHobbyTags();
  }

  function splitAddHobbies(raw) {
    String(raw || '').split(',').forEach((part) => {
      const v = part.trim();
      if (v) addHobbyTag(v);
    });
    $('#psHobbiesInput').value = '';
  }

  function showProfileSetup() {
    setupPhotos = (user.photos || ['📚', '🌅', '🎸', '🏀', '🎬', '🌊']).slice(0, 6);
    while (setupPhotos.length < 6) setupPhotos.push('🌊');
    hobbyTags = (Array.isArray(user.hobbies) ? user.hobbies : []).slice(0, 12).map(normHobby).filter(Boolean);
    renderProfileSetup();
    $('#profileSetup').classList.add('show');
  }

  function renderProfileSetup() {
    $('#psTitle').textContent = 'Build your profile';
    $('#psName').textContent = user.name;
    $('#psHandle').textContent = (user.instagram ? '@' + user.instagram + ' · ' : '') + 'your Instagram-style profile';
    $('#psAvatar').style.cssText = hueVar(user);
    $('#psAvatar').textContent = user.initials;
    $('#psPhotos').innerHTML = setupPhotos.map((emo, i) => `<div class="ig-tile" data-idx="${i}" style="background:linear-gradient(135deg, ${user.hue}, #D96A4A ${30 + i * 12}%, #E8C9A8 ${60 + i * 8}%)">${emo}</div>`).join('');
    $('#psBio').value = user.bio || '';
    $('#psSeek').value = user.seek || '';
    $('#psInstagramLock').value = user.instagram ? '@' + user.instagram : 'not set yet';
    $('#psHobbiesInput').value = '';
    renderHobbyTags();
  }

  async function finishProfileSetup() {
    if (hobbyTags.length < 2) { toast('Add at least 2 hobbies', 'warn'); return; }
    const seek = $('#psSeek').value.trim();
    if (!seek) { toast("Write what you're looking for", 'warn'); return; }
    try {
      user = (await api('/onboard', { method: 'POST', body: JSON.stringify({ hobbies: hobbyTags, seek, bio: $('#psBio').value, photos: setupPhotos }) })).user;
      enterApp();
      toast(`Welcome, ${user.name.split(' ')[0]}! Your profile is live.`, 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }

  function enterApp() {
    $('#loginOverlay').classList.remove('show');
    $('#profileSetup').classList.remove('show');
    $('.topbar').classList.add('show');
    $('.bottom-nav').classList.add('show');
    document.body.style.overflow = '';
    switchView('discover');
    renderProfile();
    renderStoryStrip();
  }

  /* ---------- views ---------- */
  window.switchView = function (name) {
    $$('.nav-tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
    $$('.view').forEach((v) => v.classList.toggle('show', v.id === 'view-' + name));
    if (name !== 'thread') stopChatPolling();
    if (name === 'discover') loadPeople();
    if (name === 'meets') renderMeets();
    if (name === 'inbox') renderInbox();
    if (name === 'notifications') renderNotifications();
    if (name === 'profile') renderProfile();
  };

  function renderChipsRow() {
    const row = $('#hobbyFilter');
    const venues = [{ id: 'all', label: '📍 All' }, { id: 'FSM', label: '🏫 FSM' }, { id: 'Monastir', label: '🌊 Monastir' }];
    row.innerHTML = venues.map((v) =>
      `<button class="chip venue-pill ${v.id === filterVenue ? 'selected' : ''}" data-kind="venue" data-venue="${v.id}">${v.label}</button>`).join('')
      + meta.hobbies.map((h) =>
      `<button class="chip" data-kind="hobby" data-hobby="${h.id}">${h.emoji} ${esc(h.label)}</button>`).join('');
  }

  /* ---------- meetups (browse) ---------- */
  async function loadMeetups() {
    const grid = $('#meetsBrowse');
    grid.innerHTML = '<div class="skeleton tall"></div>';
    try {
      const params = new URLSearchParams();
      const q = $('#searchInput').value.trim();
      if (q) params.set('q', q);
      if (filterVenue !== 'all') params.set('venue', filterVenue);
      params.set('sort', $('#sortFilter').value);
      if (filterHobbies.length) params.set('hobby', filterHobbies.join(','));
      const d = await api('/meetups?' + params.toString());
      meetups = d.meetups;
      renderMeetCards();
      renderInbox();
      renderProfile();
      captureState();
      checkMutual();
    } catch (e) {
      grid.innerHTML = '';
      toast(e.message, 'err');
    }
  }

  /* ---------- people (discover) ---------- */
  async function loadPeople() {
    const card = $('#peopleCard');
    card.innerHTML = '<div class="skeleton tall"></div>';
    $('#peopleEmpty').style.display = 'none';
    try {
      const d = await api('/people');
      allPeople = d.people || [];
      peopleQueue = allPeople.filter((p) => !personSeen.has(p.id));
      renderStoryStrip();
      if (!peopleQueue.length) {
        card.innerHTML = '';
        $('#peopleEmpty').style.display = 'block';
        return;
      }
      renderPeopleCard();
    } catch (e) {
      card.innerHTML = '';
      toast(e.message, 'err');
    }
  }

  function renderPeopleCard() {
    const p = peopleQueue[0];
    const card = $('#peopleCard');
    if (!p) {
      card.innerHTML = '';
      $('#peopleEmpty').style.display = 'block';
      return;
    }
    card.innerHTML = `
      <div class="pc-top">
        ${ringHTML(p)}
        <div class="pc-id">
          <div class="pc-name">${esc(p.name)} ${p.online ? '<span class="online-dot" title="Online now"></span>' : ''} ${p.rating !== null ? `<span class="pc-rate">${starsHTML(p.rating)} ${Number(p.rating).toFixed(1)}★</span>` : '<span class="pc-rate">✨ New face</span>'}</div>
          <div class="pc-handle">${esc(p.handle)} · ${p.meetsCount} meets · ${esc(p.seek)}</div>
        </div>
      </div>
      <div class="pc-photos ig-grid">${(p.photos || []).map((emo, i) => `<div class="ig-tile" style="background:linear-gradient(135deg, ${p.hue}, #D96A4A ${30 + i * 12}%, #E8C9A8 ${60 + i * 8}%)">${emo}</div>`).join('')}</div>
      <div class="pc-hobbies">${p.hobbies.map((t) => { const h = hobbyById(t); return `<span class="tag">${h ? h.emoji : '•'} ${esc(h ? h.label : t)}</span>`; }).join('')}</div>
      <p class="pc-bio">${esc(p.bio)}</p>
      <div class="pc-actions">
        <button class="btn btn-primary" data-action="yes">Yes, meet ${esc(p.name.split(' ')[0])} 🎉</button>
        <button class="btn btn-ghost" data-action="skip">Next →</button>
      </div>`;
  }

  function advancePerson() {
    const cur = peopleQueue.shift();
    if (cur) { personSeen.add(cur.id); lsSetJSON(SEEN_KEY, [...personSeen]); }
    renderPeopleCard();
  }

  function openSuggestModal(p) {
    activeSuggest = p;
    $('#suggestName').textContent = p.name;
    $('#suggestHint').textContent = `Based on what you both like, we suggest "${p.suggestedVenue}" — or type any other spot.`;
    $('#suggestVenue').value = p.suggestedVenue || '';
    const d = new Date(Date.now() + 2 * 86400000);
    $('#suggestDate').value = d.toISOString().slice(0, 10);
    $('#suggestTime').value = '18:00';
    $('#suggestModal').classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  async function confirmSuggest() {
    const p = activeSuggest;
    if (!p) return;
    try {
      const d = await api('/people/' + p.id + '/meet', {
        method: 'POST',
        body: JSON.stringify({ location: $('#suggestVenue').value, date: $('#suggestDate').value, time: $('#suggestTime').value }),
      });
      meetups.unshift(d.meetup);
      closeModals();
      if (d.meetup.mutual) {
        // the other side already said yes — meetup is live, open the chat
        toast(`Meet planned with ${p.name.split(' ')[0]}! 🎉`, 'ok');
        advancePerson();
        await openThread(d.meetup.id);
        checkMutual(); // ask for the FSM spot together
      } else {
        // one-sided yes → an invitation the other person can accept or decline
        toast(`Invitation sent to ${p.name.split(' ')[0]} — you'll know when they accept 💌`, 'ok');
        advancePerson();
        await loadMeetups();
        renderMeetCards();
      }
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- mutual match: both said yes → pick an FSM meeting place ---------- */
  function mutualCounterpart(m, user, list) {
    if (!user || !m.organizer || !m.organizer.userId) return null;
    // case A: the organizer (the person being met) accepted — both are participants now
    if (m.participants.some((p) => p.userId === m.organizer.userId)) return m;
    const isOrganizer = m.organizer.userId === user.id;
    const other = isOrganizer
      ? (m.participants || []).find((p) => p.userId && p.userId !== user.id)
      : m.organizer;
    if (!other || !other.userId) return null;
    const wantTitle = 'Meetup with ' + (isOrganizer ? other.name : user.name);
    return (list || meetups).find((x) => x.id !== m.id && x.title === wantTitle
      && x.organizer && x.organizer.userId === (isOrganizer ? other.userId : user.id)
      && (x.participants || []).some((p) => p.userId === (isOrganizer ? user.id : other.userId)));
  }

  function mutualPartyName(m) {
    return m.organizer && m.organizer.userId === user.id
      ? (m.participants || [])[0]?.name || ''
      : (m.organizer ? m.organizer.name : '');
  }

  function checkMutual() {
    if ($('#mutualModal').classList.contains('show')) return;
    const m = meetups.find((x) => x.mutual && !x.mutualLocationSet && !isEnded(x));
    if (m) showMutualPrompt(m);
  }

  function showMutualPrompt(m) {
    const fsm = (meta.venues && meta.venues.FSM) || ['FSM — Stade universitaire', 'FSM — Bibliothèque universitaire', 'FSM — Salle de sport'];
    const cur = m.location && fsm.includes(m.location) ? m.location : fsm[0];
    mutualMeetId = m.id;
    $('#mutualName').textContent = mutualPartyName(m);
    $('#mutualVenues').innerHTML = fsm.map((v) => `<button type="button" class="chip ${v === cur ? 'selected' : ''}" data-venue="${esc(v)}">${esc(v)}</button>`).join('');
    $('#mutualVenueInput').value = cur;
    $('#mutualModal').classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  async function confirmMutual() {
    const typed = $('#mutualVenueInput').value.trim();
    const chip = $('#mutualVenues .chip.selected');
    const location = typed || (chip ? chip.dataset.venue : '');
    if (!location) { toast('Pick a place', 'warn'); return; }
    try {
      await api('/meetups/' + mutualMeetId + '/location', { method: 'POST', body: JSON.stringify({ location }) });
      closeModals();
      toast('🎉 Meeting place set — both of you can see it!', 'ok');
      await loadMeetups();
    } catch (e) { toast(e.message, 'err'); }
  }

  let mutualMeetId = null;

  async function openPersonModal(id) {
    try {
      const d = await api('/people/' + id);
      const person = d.person;
      $('#ppAvatar').style.cssText = hueVar(person);
      $('#ppAvatar').textContent = person.initials;
      $('#ppName').innerHTML = esc(person.name) + (person.online ? ' <span class="online-dot" title="Online now"></span>' : '');
      $('#ppHandle').innerHTML = igBadgeHTML(person.instagram, person.handle, false);
      $('#ppRate').innerHTML = person.rating !== null
        ? `${starsHTML(person.rating)} ${Number(person.rating).toFixed(1)}★ · ${person.meetsCount} meets hosted`
        : `✨ New on W.I.N.K · ${person.meetsCount} meets hosted`;
      $('#ppBio').textContent = person.bio;
      $('#ppHobbies').innerHTML = person.hobbies.map((t) => { const h = hobbyById(t); return `<span class="tag">${h ? h.emoji : '•'} ${esc(h ? h.label : t)}</span>`; }).join('');
      $('#ppStats').innerHTML = `
        <div class="stat"><b>${(person.hobbies || []).length}</b><span>Hobbies</span></div>
        <div class="stat"><b>${person.meetsCount}</b><span>Meets hosted</span></div>
        <div class="stat"><b>${person.rating !== null ? Number(person.rating).toFixed(1) + '★' : '✨ New'}</b><span>General rate</span></div>`;
      $('#ppPhotos').innerHTML = (person.photos || []).map((emo, i) => `<div class="ig-tile" style="background:linear-gradient(135deg, ${person.hue}, #D96A4A ${30 + i * 12}%, #E8C9A8 ${60 + i * 8}%)">${emo}</div>`).join('');
      $('#ppMeets').innerHTML = (person.meets && person.meets.length)
        ? `<h3>Their meets</h3>${person.meets.map((m) => { const key = m.hobbies.find((t) => MEDIA_THEMES[t]) || 'travel'; const mt = MEDIA_THEMES[key]; return `<div class="meet-tile" data-meetup-tile="${m.id}"><div class="mt-bg" style="background:${mt.g}">${mt.e}</div><div class="mt-cap"><div class="mt-title">${esc(m.title)}</div><div class="mt-date">${dateLabel(m)}</div></div></div>`; }).join('')}`
        : '';
      $('#ppYes').dataset.person = person.id;
      $('#personModal').classList.add('show');
      document.body.style.overflow = 'hidden';
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- meet browse ---------- */
  function renderMeetCards() {
    $('#meetsBrowse').innerHTML = meetups.map((m) => {
      const ended = isEnded(m);
      const tags = m.hobbies.slice(0, 3).map((t) => { const h = hobbyById(t); return `<span class="tag">${h ? h.emoji : '•'} ${esc(h ? h.label : t)}</span>`; }).join('');
      return `
        <div class="meet-browse-card" data-meetup-tile="${m.id}">
          <div class="mbc-top">
            ${ringHTML(m.organizer)}
            <b>${esc(m.title)}</b>
            ${m.joinedByMe ? '<span class="badge joined">Joined</span>' : ''}
          </div>
          <div class="mbc-meta">📅 ${dateLabel(m)} · 📍 ${esc(m.location)} · 👥 ${m.participants.length}/${m.capacity}</div>
          <div class="mbc-tags">${tags}</div>
          ${m.avgRating !== null ? `<div class="mbc-rate">${starsHTML(m.avgRating)} ${m.avgRating.toFixed(1)}★</div>` : ''}
          ${!m.joinedByMe && !ended ? `<button class="btn btn-primary btn-small mbc-join" data-action="join" data-id="${m.id}">Join meet</button>` : ''}
        </div>`;
    }).join('');
  }

  $('#meetsBrowse').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="join"]');
    if (!btn) return;
    e.stopPropagation();
    const m = meetups.find((x) => x.id === btn.dataset.id);
    if (!m) return;
    try {
      const d = await api('/meetups/' + m.id + '/join', { method: 'POST', body: '{}' });
      Object.assign(m, d.meetup);
      toast(`Joined "${m.title}" 🎉`);
      renderMeetCards();
      renderMyMeets();
      renderInbox();
      renderProfile();
      captureState();
    } catch (err) { toast(err.message, 'err'); }
  });

  /* ---------- post detail modal ---------- */
  function openMeetupModal(id) {
    const m = meetups.find((x) => x.id === id);
    if (!m) return;
    renderMeetupModal(m);
    $('#meetupModal').classList.add('show');
    document.body.style.overflow = 'hidden';
    checkMutual(); // a mutual meetup without a spot yet → prompt for the FSM location
  }

  function closeModals() {
    $('#meetupModal').classList.remove('show');
    $('#createModal').classList.remove('show');
    $('#locModal').classList.remove('show');
    $('#suggestModal').classList.remove('show');
    $('#personModal').classList.remove('show');
    $('#mutualModal').classList.remove('show');
    document.body.style.overflow = '';
  }

  function renderMeetupModal(m) {
    const ended = isEnded(m);
    const joined = m.joinedByMe;
    const mine = m.reviews.find((r) => r.authorName === user.name);
    pickerRating = 0;

    const rateBox = joined && ended && !mine
      ? `
        <div class="m-section">
          <h3>⭐ How was your meet?</h3>
          <div class="rate-box">
            <div class="star-picker" id="starPicker">
              ${[1, 2, 3, 4, 5].map((v) => `<button type="button" data-val="${v}">★</button>`).join('')}
            </div>
            <textarea id="rateText" rows="2" placeholder="Leave a comment so others know what to expect…"></textarea>
            <button class="btn btn-primary" data-action="rate" data-id="${m.id}">Submit rating</button>
          </div>
        </div>`
      : (mine && joined
        ? `<div class="m-section"><div class="rate-done">✓ Thanks for your ${starsHTML(mine.rating)} review — see it below!</div></div>`
        : '');

    $('#meetupModalBody').innerHTML = `
      <div class="m-badges">
        <span class="badge ${ended ? 'ended' : 'upcoming'}">${ended ? 'Ended' : 'Upcoming'}</span>
        ${m.match !== null ? `<span class="badge match">${m.match}% match with you</span>` : ''}
      </div>
      <h2>${esc(m.title)}</h2>
      <div class="m-org">
        ${ringHTML(m.organizer)}
        <div>
          <div class="post-author">${esc(m.organizer.name)} ${m.organizer.userId === user.id ? '· You' : ''}</div>
          <div class="post-meta">${dateLabel(m)} · ${m.createdByUser ? 'Hosting' : 'Organizer'}</div>
        </div>
      </div>
      ${mediaHTML(m)}
      <div class="m-tags">${m.hobbies.map((t) => { const h = hobbyById(t); return `<span class="tag">${h ? h.emoji : '•'} ${esc(h ? h.label : t)}</span>`; }).join('')}</div>
      <div class="m-meta">
        <span>🕐 ${esc(m.time)}</span>
        <span>👥 ${m.participants.length}/${m.capacity} joined</span>
        ${m.avgRating !== null ? `<span>${starsHTML(m.avgRating)} ${m.avgRating.toFixed(1)}★</span>` : ''}
      </div>
      <div class="m-loc">
        <span class="pin-ico">📍</span>
        <span class="loc-text">${esc(m.location)}</span>
        <button class="copy-btn" data-action="copy" data-id="${m.id}">Copy</button>
      </div>
      <div class="m-section">
        <h3>Who's coming</h3>
        <div class="m-people">${m.participants.map((p) => `<span class="m-person">${avatarHTML(p)} ${esc(p.name)}${p.userId === user.id ? ' · You' : ''}</span>`).join('')}</div>
      </div>
      ${rateBox}
      <div class="m-section">
        <h3>Reviews &amp; ratings ${m.avgRating !== null ? `· ${m.avgRating.toFixed(1)}★` : ''}</h3>
        ${m.reviews.map((r) => `
          <div class="review">
            ${avatarHTML({ initials: r.initials, hue: r.hue }, '')}
            <div style="flex:1">
              <div class="r-head">${esc(r.authorName)}${r.authorName === user.name ? ' (You)' : ''}<span class="when">${relTime(r.date)}</span></div>
              <div class="r-stars">${starsHTML(r.rating)}</div>
              <div class="r-text">${esc(r.comment)}</div>
            </div>
          </div>`).join('') || '<p class="muted" style="font-size:13px">No reviews yet — be the first after the meet!</p>'}
      </div>
      ${(m.comments || []).length ? `
        <div class="m-section">
          <h3>💬 Discussion (${m.comments.length})</h3>
          ${m.comments.map((c) => `
            <div class="review">
              <div class="r-head">${esc(c.authorName)}${c.authorName === user.name ? ' (You)' : ''}<span class="when">${relTime(c.date)}</span></div>
              <div class="r-text">${esc(c.text)}</div>
            </div>`).join('')}
        </div>` : ''}
      <div class="m-section">
        <h3>💬 Leave a comment</h3>
        <div class="comment-input">
          <input type="text" class="comment-field" data-modal-comment data-id="${m.id}" placeholder="Write something nice…" autocomplete="off">
          <button class="comment-post" data-action="modal-comment" data-id="${m.id}">Post</button>
        </div>
      </div>
      <div class="m-actions">
        ${m.requestedForMe
          ? `<button class="btn btn-primary" data-action="accept" data-id="${m.id}">✅ Accept — let's meet</button>
             <button class="btn btn-danger" data-action="decline" data-id="${m.id}">✕ Decline</button>`
          : (ended && !joined ? '' : joined
            ? `<button class="btn btn-danger" data-action="leave" data-id="${m.id}">Leave meet</button>`
            : `<button class="btn btn-primary" data-action="join" data-id="${m.id}">Join this meet</button>`)}
        ${(joined || m.organizer.userId === user.id) ? `<button class="btn btn-ghost" data-action="chat" data-id="${m.id}">💬 Group chat</button>` : ''}
        ${ended ? `<button class="btn btn-ghost" data-action="again" data-id="${m.id}">🔁 Meet again</button>` : ''}
      </div>
      ${m.requestedForMe ? `<div class="m-section"><div class="req-banner">💌 <b>${esc(m.organizer.name)}</b> wants to meet you — accept to join the meet and pick your spot together.</div></div>` : ''}`;

    const picker = $('#starPicker');
    if (picker) {
      picker.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-val]');
        if (!btn) return;
        pickerRating = Number(btn.dataset.val);
        $$('#starPicker button').forEach((b) => b.classList.toggle('lit', Number(b.dataset.val) <= pickerRating));
      });
    }
  }

  $('#meetupModalBody').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[data-modal-comment]')) {
      e.preventDefault();
      const btn = document.querySelector(`[data-action="modal-comment"][data-id="${e.target.dataset.id}"]`);
      if (btn) btn.click();
    }
  });

  $('#meetupModalBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const m = meetups.find((x) => x.id === id);
    if (!m) return;

    try {
      if (btn.dataset.action === 'accept') {
        const d = await api('/meetups/' + id + '/accept', { method: 'POST', body: '{}' });
        Object.assign(m, d.meetup);
        toast("🎉 You're in — say hi in the chat!", 'ok');
        closeModals();
        renderMyMeets();
        renderMeetCards();
        renderInbox();
        renderProfile();
        captureState();
        await openThread(id);
        checkMutual(); // both said yes now — pick the FSM spot together
      } else if (btn.dataset.action === 'decline') {
        await api('/meetups/' + id + '/decline', { method: 'POST', body: '{}' });
        meetups = meetups.filter((x) => x.id !== id);
        toast('Declined — the meet was cancelled for both sides', 'ok');
        closeModals();
        renderMyMeets();
        renderMeetCards();
        renderInbox();
        renderProfile();
        captureState();
      } else if (btn.dataset.action === 'join') {
        const d = await api('/meetups/' + id + '/join', { method: 'POST', body: '{}' });
        Object.assign(m, d.meetup);
        toast(`Joined "${m.title}" 🎉`, 'ok');
        renderMeetupModal(m);
        renderMyMeets();
        renderMeetCards();
        renderInbox();
        renderProfile();
        captureState();
      } else if (btn.dataset.action === 'leave') {
        const d = await api('/meetups/' + id + '/leave', { method: 'POST', body: '{}' });
        Object.assign(m, d.meetup);
        toast('Left the meet');
        renderMeetupModal(m);
        renderMyMeets();
        renderMeetCards();
        renderInbox();
        captureState();
      } else if (btn.dataset.action === 'rate') {
        if (pickerRating === 0) { toast('Pick a star rating first', 'warn'); return; }
        const d = await api('/meetups/' + id + '/review', {
          method: 'POST',
          body: JSON.stringify({ rating: pickerRating, comment: ($('#rateText').value || '').trim() }),
        });
        Object.assign(m, d.meetup);
        pickerRating = 0;
        toast('Rating submitted ⭐', 'ok');
        renderMeetupModal(m);
        renderMyMeets();
        renderMeetCards();
        renderProfile();
        captureState();
      } else if (btn.dataset.action === 'chat') {
        activeThreadId = id;
        closeModals();
        await openThread(id);
      } else if (btn.dataset.action === 'again') {
        const d = await api('/meetups/' + id + '/again', { method: 'POST', body: '{}' });
        meetups.unshift(d.meetup);
        toast('Round 2 scheduled for next week! 🔁', 'ok');
        closeModals();
        renderMyMeets();
        renderMeetCards();
        renderInbox();
        renderProfile();
        captureState();
      } else if (btn.dataset.action === 'modal-comment') {
        const input = document.querySelector(`[data-modal-comment][data-id="${id}"]`);
        const text = (input && input.value || '').trim();
        if (!text) { toast('Write something first', 'warn'); return; }
        const cd = await api('/meetups/' + id + '/comments', { method: 'POST', body: JSON.stringify({ text }) });
        Object.assign(m, cd.meetup);
        renderMeetupModal(m);
        captureState();
        toast('Comment posted 💬', 'ok');
      } else if (btn.dataset.action === 'copy') {
        try { navigator.clipboard.writeText(m.location); } catch (err) {}
        toast('Location copied — ' + m.location);
      }
    } catch (err) { toast(err.message, 'err'); }
  });

  /* ---------- create meet ---------- */
  function openCreateModal() {
    $('#createHobbies').innerHTML = meta.hobbies.map((h) =>
      `<button type="button" class="chip" data-hobby="${h.id}">${h.emoji} ${esc(h.label)}</button>`).join('');
    const d = new Date(Date.now() + 2 * 86400000);
    $('#createDate').value = d.toISOString().slice(0, 10);
    $('#createModal').classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  $('#createHobbies').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) chip.classList.toggle('selected');
  });

  $('#createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const d = await api('/meetups', {
        method: 'POST',
        body: JSON.stringify({
          title: $('#createTitle').value,
          desc: $('#createDesc').value,
          hobbies: $$('#createHobbies .chip.selected').map((c) => c.dataset.hobby),
          location: $('#createVenue').value,
          date: $('#createDate').value,
          time: $('#createTime').value,
          capacity: Number($('#createCap').value),
        }),
      });
      meetups.unshift(d.meetup);
      $('#createForm').reset();
      closeModals();
      renderMeetCards();
      renderMyMeets();
      renderInbox();
      renderProfile();
      captureState();
      toast('Meet published — people who match will see it! 🎉', 'ok');
      switchView('discover');
    } catch (err) { toast(err.message, 'err'); }
  });

  /* ---------- my meets ---------- */
  function renderMyMeets() {
    const mine = (m) => m.joinedByMe || m.organizer.userId === user.id;
    const upcoming = meetups.filter((m) => mine(m) && !isEnded(m));
    const past = meetups.filter((m) => mine(m) && isEnded(m)).sort((a, b) => new Date(b.date) - new Date(a.date));
    const requests = meetups.filter((m) => m.requestedForMe && !isEnded(m));
    $('#meetsEmpty').style.display = (upcoming.length + past.length || meetups.length) ? 'none' : 'block';
    $('#meetsRequests').innerHTML = requests.length
      ? `<div class="meets-section"><div class="section-title">💌 Meet requests <span class="count">${requests.length}</span></div>${requests.map((m) => requestCardHTML(m)).join('')}</div>`
      : '';
    $('#meetsUpcoming').innerHTML = upcoming.length
      ? `<div class="meets-section"><div class="section-title">⚡ Upcoming <span class="count">${upcoming.length}</span></div>${upcoming.map((m) => meetCardHTML(m)).join('')}</div>`
      : '';
    $('#meetsPast').innerHTML = past.length
      ? `<div class="meets-section"><div class="section-title">🕒 Past meets <span class="count">${past.length}</span></div>${past.map((m) => {
        const mine = m.reviews.find((r) => r.authorName === user.name);
        return meetCardHTML(m) + (mine
          ? `<div class="rated-note">✓ You rated this meet ${starsHTML(mine.rating)}</div>`
          : `<button class="rate-btn" data-action="open" data-id="${m.id}">⭐ Rate this meet</button>`);
      }).join('')}</div>`
      : '';
    $('#meetsRequests').onclick = handleRequestClick;
    $('#meetsUpcoming').onclick = handleMeetClick;
    $('#meetsPast').onclick = handleMeetClick;
  }

  function requestCardHTML(m) {
    // the requester is the participant who tapped yes — the organizer is you (the one being met)
    const requester = (m.participants || []).find((p) => p.userId !== m.organizer.userId) || m.organizer;
    return `
      <div class="meet-card request-card" data-action="open" data-id="${m.id}">
        <div class="mc-top">${ringHTML(requester, '')} <div class="mc-title">${esc(requester.name)} wants to meet you</div></div>
        <div class="mc-line">📅 ${dateLabel(m)} · 📍 ${esc(m.location)}</div>
        <div class="request-actions">
          <button class="btn btn-primary sm" data-action="accept" data-id="${m.id}">✅ Accept</button>
          <button class="btn btn-ghost sm" data-action="decline" data-id="${m.id}">✕ Decline</button>
        </div>
      </div>`;
  }

  async function handleRequestClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'open') { openMeetupModal(btn.dataset.id); return; }
    if (btn.dataset.action !== 'accept' && btn.dataset.action !== 'decline') return;
    const id = btn.dataset.id;
    const m = meetups.find((x) => x.id === id);
    if (!m) return;
    try {
      if (btn.dataset.action === 'accept') {
        const d = await api('/meetups/' + id + '/accept', { method: 'POST', body: '{}' });
        Object.assign(m, d.meetup);
        toast("🎉 You're in — say hi in the chat!", 'ok');
        renderMyMeets();
        renderMeetCards();
        renderInbox();
        renderProfile();
        captureState();
        await openThread(id);
        checkMutual();
      } else {
        await api('/meetups/' + id + '/decline', { method: 'POST', body: '{}' });
        meetups = meetups.filter((x) => x.id !== id);
        toast('Declined — the meet was cancelled for both sides', 'ok');
        renderMyMeets();
        renderMeetCards();
        renderInbox();
        renderProfile();
        captureState();
      }
    } catch (err) { toast(err.message, 'err'); }
  }

  async function renderMeets() {
    renderMyMeets();
    await loadMeetups();
  }

  function meetCardHTML(m) {
    return `
      <div class="meet-card" data-action="open" data-id="${m.id}">
        <div class="mc-top">${ringHTML(m.organizer, '')} <div class="mc-title">${esc(m.title)}</div></div>
        <div class="mc-line">📅 ${dateLabel(m)} · 📍 ${esc(m.location)}</div>
        <div class="mc-tags">${m.hobbies.slice(0, 3).map((t) => { const h = hobbyById(t); return `<span class="tag">${h ? h.emoji : ''} ${esc(h ? h.label : t)}</span>`; }).join('')}</div>
      </div>`;
  }

  function handleMeetClick(e) {
    const el = e.target.closest('[data-action="open"]');
    if (el) openMeetupModal(el.dataset.id);
  }

  /* ---------- inbox / DMs ---------- */
  function previewText(msg) {
    if (msg.kind === 'location') return '📍 ' + msg.location + (msg.time ? ' · ' + msg.time : '');
    return msg.text;
  }
  function miniMapSVG() {
    return `<svg viewBox="0 0 240 70" aria-hidden="true">
      <rect width="240" height="70" rx="10" fill="#EDE3D2"/>
      <path d="M0,48 Q70,38 140,44 T240,42 L240,70 L0,70 Z" fill="#D9C9B2"/>
      <g stroke="#C9B79C" stroke-width="2" opacity=".7"><line x1="0" y1="26" x2="240" y2="26"/><line x1="90" y1="0" x2="90" y2="70"/><line x1="170" y1="0" x2="170" y2="70"/></g>
      <g transform="translate(70,20)"><circle r="10" class="pulse"/><circle r="4.5" fill="#D96A4A"/><circle r="1.8" fill="#fff"/></g>
    </svg>`;
  }
  function unreadCount(meetupId) {
    const seen = lastSeen[meetupId];
    const thread = chats[meetupId];
    if (!thread) return 0;
    return thread.filter((msg) => msg.authorName !== user.name && (!seen || new Date(msg.date) > new Date(seen))).length;
  }
  function totalUnread() {
    return meetups
      .filter((m) => m.joinedByMe || m.organizer.userId === user.id)
      .reduce((a, m) => a + unreadCount(m.id), 0);
  }
  function updateBadges() {
    const total = totalUnread();
    const badge = $('#navBadge');
    if (!badge) return;
    badge.textContent = total;
    badge.hidden = !total;
  }

  /* ---------- notifications ---------- */
  function captureState() {
    const seen = {};
    meetups.forEach((m) => { seen[m.id] = { p: m.participants.length, c: (m.comments || []).length }; });
    lsSetJSON(STATE_KEY, { at: new Date().toISOString(), seen });
  }

  function buildNotifications() {
    const out = [];
    if (state) {
      const at = new Date(state.at).getTime();
      meetups.forEach((m) => {
        const s = state.seen[m.id];
        if (s) {
          if (m.participants.length > s.p) {
            const d = m.participants.length - s.p;
            out.push({ id: m.id, icon: '👥', text: `${d} new person${d > 1 ? 's' : ''} going to “${m.title}”`, when: m.date, kind: 'meet' });
          }
          if ((m.comments || []).length > s.c) {
            const d = m.comments.length - s.c;
            out.push({ id: m.id, icon: '💬', text: `${d} new comment${d > 1 ? 's' : ''} on “${m.title}”`, when: m.date, kind: 'meet' });
          }
        } else if (m.createdByUser && new Date(m.createdAt || 0).getTime() > at) {
          out.push({ id: m.id, icon: '✨', text: `New meet planned: “${m.title}”`, when: m.date, kind: 'meet' });
        }
      });
      meetups.forEach((m) => {
        if (m.requestedForMe && !state.seen[m.id]) {
          out.push({ id: m.id, icon: '💌', text: `${m.organizer.name} wants to meet you — accept or decline in Meets`, when: m.date, kind: 'meet' });
        }
      });
    }
    const unread = totalUnread();
    if (unread) out.push({ icon: '✉️', text: `${unread} unread message${unread > 1 ? 's' : ''} in your meetup chats`, when: new Date(), kind: 'chat' });
    return out.sort((a, b) => new Date(b.when) - new Date(a.when));
  }

  function updateBell() {
    const n = buildNotifications().length;
    const el = $('#bellCount');
    if (!el) return;
    el.textContent = n;
    el.hidden = !n;
  }

  function renderNotifications() {
    const list = buildNotifications();
    $('#notifList').innerHTML = list.length
      ? list.map((n, i) => `
        <button class="notif-item" data-kind="${n.kind}" data-id="${esc(n.id || '')}" style="animation-delay:${Math.min(i, 8) * 40}ms">
          <span class="notif-ico">${n.icon}</span>
          <div class="notif-main">
            <div class="notif-text">${esc(n.text)}</div>
            <div class="notif-when">${relTime(n.when)}</div>
          </div>
        </button>`).join('')
      : '<div class="empty-state"><div class="empty-icon">🔔</div><h3>All caught up!</h3><p>No new activity since your last visit.</p></div>';
    updateBell();
  }

  async function loadChat(id) {
    try {
      const d = await api('/chats/' + id);
      chats[id] = d.messages;
      return chats[id];
    } catch (e) { return chats[id] || []; }
  }

  async function renderInbox() {
    const ids = meetups
      .filter((m) => m.joinedByMe || m.organizer.userId === user.id)
      .map((m) => m.id);
    $('#chatList').innerHTML = ids.length
      ? ids.map((id) => {
        const m = meetups.find((x) => x.id === id);
        const thread = chats[id] || [];
        const last = thread[thread.length - 1];
        const un = unreadCount(id);
        return `<button class="conv" data-thread="${id}">
          ${ringHTML(m.organizer)}
          <div class="conv-main">
            <div class="conv-title">${esc(m.title)}</div>
            <div class="conv-preview">${last ? esc(previewText(last)) : 'No messages yet'}</div>
          </div>
          <div class="conv-side">
            <span class="conv-time">${last ? relTime(last.date) : ''}</span>
            ${un ? `<span class="conv-unread">${un}</span>` : ''}
          </div>
        </button>`;
      }).join('')
      : '<div class="conv-list" style="padding:30px 14px;text-align:center;color:var(--muted);font-size:13.5px">No conversations yet — join a meetup and say hi 💬</div>';
    updateBadges();
  }

  async function openThread(id) {
    activeThreadId = id;
    await loadChat(id);
    renderThread(id);
    switchView('thread');
    startChatPolling();
  }

  function stopChatPolling() { if (chatTimer) { clearInterval(chatTimer); chatTimer = null; } }
  function startChatPolling() {
    stopChatPolling();
    chatTimer = setInterval(async () => {
      if (!activeThreadId) return stopChatPolling();
      const before = (chats[activeThreadId] || []).length;
      await loadChat(activeThreadId);
      const after = (chats[activeThreadId] || []).length;
      if (after !== before) renderThread(activeThreadId);
      await renderInbox();
    }, 3000);
  }

  function renderThread(id) {
    const m = meetups.find((x) => x.id === id);
    const thread = chats[id] || [];
    if (!m) return;
    lastSeen[id] = new Date().toISOString();
    lsSetJSON(LS_KEY, lastSeen);

    $('#view-thread').innerHTML = `
      <header class="thread-head">
        <button class="thread-back" id="threadBack">←</button>
        ${ringHTML(m.organizer)}
        <div class="thread-head-main">
          <div class="thread-title">${esc(m.title)}</div>
          <div class="thread-sub">📅 ${dateLabel(m)} · 📍 ${esc(m.location)}</div>
        </div>
      </header>
      <div class="messages" id="messages">
        ${thread.map((msg) => {
          const mine = msg.authorName === user.name;
          const body = msg.kind === 'location'
            ? `<div class="msg-loc">
                 <div class="msg-loc-head">📍 ${esc(msg.location)}${msg.time ? ` · 🕐 ${esc(msg.time)}` : ''}</div>
                 <div class="msg-loc-map">${miniMapSVG()}</div>
                 ${msg.note ? `<div class="msg-loc-note">${esc(msg.note)}</div>` : ''}
               </div>`
            : esc(msg.text);
          return `<div class="msg ${mine ? 'mine' : 'theirs'}">
            ${mine ? '' : avatarHTML({ initials: msg.initials, hue: msg.hue }, 'sm')}
            <div class="msg-body">
              ${mine ? '' : `<div class="msg-author">${esc(msg.authorName)}</div>`}
              <div class="msg-bubble">${body}</div>
              <div class="msg-meta"><button class="msg-react" data-react="${msg.id}" title="Like">👍</button><span>${relTime(msg.date)}</span></div>
            </div>
          </div>`;
        }).join('') || '<div class="chat-empty" style="margin:auto;color:var(--muted)">No messages yet — say hi! 👋</div>'}
      </div>
      <div class="composer">
        <button class="composer-icon" id="sendLocBtn" title="Send a meeting point">📍</button>
        <input type="text" id="chatInput" placeholder="Write something nice…" autocomplete="off">
        <button class="composer-send" id="chatSend" title="Send">➤</button>
      </div>`;

    const box = $('#messages');
    box.scrollTop = box.scrollHeight;
    $('#chatSend').addEventListener('click', sendMessage);
    $('#chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
    $('#sendLocBtn').addEventListener('click', openLocationModal);
    $('#threadBack').addEventListener('click', () => { activeThreadId = null; stopChatPolling(); switchView('inbox'); });
    $$('#view-thread [data-react]').forEach((b) => b.addEventListener('click', () => reactMessage(b)));
  }

  async function sendMessage() {
    const input = $('#chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text || !activeThreadId) return;
    try {
      await api('/chats/' + activeThreadId + '/messages', { method: 'POST', body: JSON.stringify({ text }) });
      input.value = '';
      await loadChat(activeThreadId);
      renderThread(activeThreadId);
    } catch (e) { toast(e.message, 'err'); }
  }

  function reactMessage(btn) {
    const msg = (chats[activeThreadId] || []).find((x) => x.id === btn.dataset.react);
    if (!msg) return;
    msg.text = msg.text + ' 👍';
    renderThread(activeThreadId);
  }

  function openLocationModal() {
    if (!activeThreadId) return;
    $('#locModal').classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  $('#locSend').addEventListener('click', async () => {
    const venue = $('#locVenue').value;
    const time = $('#locTime').value;
    const note = $('#locNote').value.trim();
    if (!activeThreadId) return;
    try {
      await api('/chats/' + activeThreadId + '/messages', {
        method: 'POST',
        body: JSON.stringify({ kind: 'location', location: venue, time, note }),
      });
      $('#locModal').classList.remove('show');
      $('#locTime').value = '';
      $('#locNote').value = '';
      document.body.style.overflow = '';
      await loadChat(activeThreadId);
      renderThread(activeThreadId);
      toast('Location sent to the group 📍', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  });

  /* instagram badge — clickable link when a handle exists, add-prompt otherwise */
  function igBadgeHTML(instagram, handle, isProfile) {
    const ig = instagram ? String(instagram).replace(/^@/, '') : '';
    const svg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="6" stroke="#BC5236" stroke-width="2.5"/><circle cx="12" cy="12" r="5" stroke="#BC5236" stroke-width="2.5"/><circle cx="17.5" cy="6.5" r="1.5" fill="#BC5236"/></svg>`;
    if (ig) return `<a class="ig-link" href="https://instagram.com/${encodeURIComponent(ig)}" target="_blank" rel="noopener">${svg} @${esc(ig)}</a>`;
    if (isProfile) return `<span class="ig-add">${svg} Add your @instagram</span>`;
    return `${svg} @${esc(handle || 'wink')}`;
  }
  async function openInstagramEditor() {
    const cur = user && user.instagram ? String(user.instagram).replace(/^@/, '') : '';
    const next = prompt('Your Instagram handle (without the @):', cur);
    if (next === null) return;
    const ig = String(next).trim().replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 30);
    if (ig && !/^[A-Za-z0-9._-]+$/.test(ig)) { toast('Invalid handle — use letters, numbers, . _ -', 'warn'); return; }
    try {
      user = (await api('/profile/instagram', { method: 'POST', body: JSON.stringify({ instagram: ig }) })).user;
      renderProfile();
      toast(ig ? `✅ Linked @${ig} — open it from your profile` : 'Instagram handle removed', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- profile ---------- */
  function renderProfile() {
    if (!user) return;
    $('#profileName').textContent = user.name;
    $('#profileAvatar').style.cssText = hueVar(user);
    $('#profileAvatar').textContent = user.initials;
    $('#profileIg').innerHTML = igBadgeHTML(user.instagram, user.handle, true);
    $('#profileIg').onclick = () => openInstagramEditor();
    $('#profileBio').textContent = user.seek ? `${user.seek} · on W.I.N.K` : 'New on W.I.N.K';
    const joinedCount = meetups.filter((m) => m.joinedByMe).length;
    const hostedCount = meetups.filter((m) => m.organizer.userId === user.id).length;
    const reviewCount = meetups.reduce((a, m) => a + m.reviews.filter((r) => r.authorName === user.name).length, 0);
    const myHosted = meetups.filter((m) => m.organizer.userId === user.id && m.reviews.length);
    const myRating = myHosted.length ? myHosted.reduce((a, m) => a + m.reviews.reduce((s, r) => s + r.rating, 0) / m.reviews.length, 0) / myHosted.length : null;
    $('#profileStats').innerHTML = `
      <div class="stat"><b>${joinedCount}</b><span>Meets joined</span></div>
      <div class="stat"><b>${hostedCount}</b><span>Meets hosted</span></div>
      <div class="stat"><b>${reviewCount}</b><span>Reviews</span></div>
      <div class="stat"><b>${myRating !== null ? myRating.toFixed(1) + '★' : '—'}</b><span>General rate</span></div>`;
    renderProfileStories();

    // meets tab
    const myMeets = meetups.filter((m) => m.joinedByMe || m.organizer.userId === user.id);
    $('#profileMeets').innerHTML = myMeets.map((m) => {
      const key = m.hobbies.find((t) => MEDIA_THEMES[t]) || 'travel';
      const t = MEDIA_THEMES[key];
      return `<div class="meet-tile" data-meetup-tile="${m.id}">
        <div class="mt-bg" style="background:${t.g}">${t.e}</div>
        <div class="mt-cap"><div class="mt-title">${esc(m.title)}</div><div class="mt-date">${dateLabel(m)}</div></div>
      </div>`;
    }).join('');

    // reviews tab
    const myReviews = [];
    meetups.forEach((m) => m.reviews.filter((r) => r.authorName === user.name).forEach((r) => myReviews.push({ m, r })));
    $('#profileReviews').innerHTML = myReviews.length
      ? myReviews.map(({ m, r }) => `
        <div class="review-card" data-meetup-tile="${m.id}">
          <div class="rc-head">${starsHTML(r.rating)} ${esc(r.comment)}</div>
          <div class="rc-meet">on “${esc(m.title)}” · ${relTime(r.date)}</div>
        </div>`).join('')
      : '<p class="muted" style="padding:20px;text-align:center;font-size:13.5px">No reviews yet — rate a past meet!</p>';

    switchProfileTab(profileTab);
  }

  function switchProfileTab(tab) {
    profileTab = tab;
    $$('.ptab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    $('#profilePaneStories').style.display = tab === 'stories' ? 'block' : 'none';
    $('#profilePaneMeets').style.display = tab === 'meets' ? 'block' : 'none';
    $('#profilePaneReviews').style.display = tab === 'reviews' ? 'block' : 'none';
  }

  /* ---------- snapchat-style stories ---------- */
  const STORY_KEY = 'wink_story_seen';
  let storySeen = new Set(lsGetJSON(STORY_KEY, []));
  let storyPerson = null; // whose story is open
  let storyIndex = 0;
  let storyTimer = null;
  const STORY_MS = 4200; // auto-advance per snap

  // who has a story: me first, then everyone in the people list
  function storyPeople() {
    const list = [{
      id: 'me', name: user.name, hue: user.hue, initials: user.initials,
      photos: user.photos || [], bio: user.seek || user.bio || '', mine: true,
    }];
    (allPeople || []).forEach((p) => list.push({
      id: p.id, name: p.name, hue: p.hue, initials: p.initials,
      photos: p.photos || [], bio: p.bio || '', handle: p.handle,
    }));
    return list;
  }

  function storyBubbleHTML(sp) {
    const unseen = !storySeen.has(sp.id);
    const plus = sp.mine && unseen ? '<span class="plus">+</span>' : '';
    return `<div class="story-bubble" data-story="${esc(sp.id)}">
      <span class="sb-ring ${unseen ? 'unseen' : ''}">${avatarHTML(sp)}${plus}</span>
      <span class="story-name">${sp.mine ? 'My story' : esc(sp.name)}</span>
    </div>`;
  }

  function renderStoryStrip() {
    const el = $('#storyStrip');
    if (!el || !user) return;
    const list = storyPeople();
    if (!list.length || !list.some((s) => (s.photos || []).length)) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = `<div class="section-title">📸 Stories</div><div class="story-strip" style="padding:0">${list.map(storyBubbleHTML).join('')}</div>`;
  }

  function renderProfileStories() {
    const el = $('#profileStories');
    if (!el || !user) return;
    const list = storyPeople().filter((s) => (s.photos || []).length);
    el.innerHTML = list.length
      ? `<div class="section-title">📸 Stories <span class="muted">— tap a ring to open</span></div><div class="story-row">${list.map(storyBubbleHTML).join('')}</div>`
      : '<p class="muted" style="padding:20px;text-align:center;font-size:13.5px">No stories yet — add photos to your profile!</p>';
  }

  function openStory(sp) {
    if (!sp || !(sp.photos || []).length) return;
    storyPerson = sp;
    storyIndex = 0;
    $('#svProgress').innerHTML = sp.photos.map(() => '<span class="sv-bar"><span class="sv-fill"></span></span>').join('');
    $('#svAvatar').style.cssText = hueVar(sp) + ';border:2.5px solid #fff';
    $('#svAvatar').textContent = sp.initials || '?';
    $('#svName').textContent = sp.mine ? 'My story' : sp.name;
    $('#svTime').textContent = 'snapped just now';
    $('#svReply').value = '';
    renderStorySnap();
    $('#storyViewer').classList.add('show');
    document.body.style.overflow = 'hidden';
    startStoryTimer();
  }

  function renderStorySnap() {
    const sp = storyPerson;
    if (!sp) return;
    const photos = sp.photos;
    const idx = Math.max(0, Math.min(storyIndex, photos.length - 1));
    const emoji = photos[idx];
    $('#svBg').style.cssText = `background:linear-gradient(135deg, ${sp.hue}, #E7A86A 55%, #E8C9A8)`;
    $('#svEmoji').textContent = emoji;
    $('#svCaption').textContent = sp.bio || '';
    const bars = $$('#svProgress .sv-bar');
    bars.forEach((b, i) => {
      b.classList.toggle('done', i < idx);
      const fill = b.querySelector('.sv-fill');
      if (i < idx) fill.style.width = '100%';
      else if (i === idx) fill.style.width = '0%';
      else fill.style.width = '0%';
    });
    restartStoryTimer();
  }

  function startStoryTimer() {
    stopStoryTimer();
    storyTimer = setInterval(() => svNext(), STORY_MS);
  }
  function stopStoryTimer() { if (storyTimer) { clearInterval(storyTimer); storyTimer = null; } }
  function restartStoryTimer() { if (storyTimer) startStoryTimer(); }

  function svNext() {
    if (!storyPerson) return;
    if (storyIndex >= storyPerson.photos.length - 1) { closeStory(); return; }
    storyIndex++;
    renderStorySnap();
  }
  function svPrev() {
    if (!storyPerson) return;
    if (storyIndex <= 0) return;
    storyIndex--;
    renderStorySnap();
  }

  function closeStory() {
    stopStoryTimer();
    if (storyPerson && !storySeen.has(storyPerson.id)) {
      storySeen.add(storyPerson.id);
      lsSetJSON(STORY_KEY, [...storySeen]);
    }
    storyPerson = null;
    storyIndex = 0;
    $('#storyViewer').classList.remove('show');
    if (profileTab === 'stories') renderProfileStories();
    renderStoryStrip();
    document.body.style.overflow = '';
  }

  /* ---------- wiring ---------- */
  function wireStatic() {
    $('#loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#loginName').value.trim();
      const instagram = $('#loginInstagram').value.trim();
      if (name) doLogin(name, instagram);
    });
    $('#psHobbiesInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        splitAddHobbies($('#psHobbiesInput').value);
      }
    });
    $('#psHobbiesInput').addEventListener('blur', () => splitAddHobbies($('#psHobbiesInput').value));
    $('#psHobbiesTags').addEventListener('click', (e) => {
      const x = e.target.closest('.tag-x');
      if (!x) return;
      hobbyTags.splice(Number(x.dataset.idx), 1);
      renderHobbyTags();
    });
    $('#psPhotos').addEventListener('click', (e) => {
      const tile = e.target.closest('.ig-tile');
      if (!tile) return;
      const i = Number(tile.dataset.idx);
      if (Number.isNaN(i)) return;
      setupPhotos[i] = PHOTO_PALETTE[(PHOTO_PALETTE.indexOf(setupPhotos[i]) + 1) % PHOTO_PALETTE.length];
      tile.textContent = setupPhotos[i];
    });
    $('#psNext').addEventListener('click', finishProfileSetup);

    $$('.nav-tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));
    $('#createBtn').addEventListener('click', openCreateModal);

    // people cards
    $('#peopleCard').addEventListener('click', (e) => {
      const act = e.target.closest('[data-action]');
      const p = peopleQueue[0];
      if (!p) return;
      if (act && act.dataset.action === 'yes') { openSuggestModal(p); return; }
      if (act && act.dataset.action === 'skip') { advancePerson(); return; }
      openPersonModal(p.id);
    });

    // suggest meeting modal
    $('#suggestConfirm').addEventListener('click', confirmSuggest);
    $('#suggestCancel').addEventListener('click', () => { closeModals(); });
    $('#suggestClose').addEventListener('click', closeModals);

    // mutual match — choose the FSM meeting place
    $('#mutualConfirm').addEventListener('click', confirmMutual);
    $('#mutualClose').addEventListener('click', closeModals);
    $('#mutualVenues').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      $$('#mutualVenues .chip').forEach((c) => c.classList.toggle('selected', c === chip));
      $('#mutualVenueInput').value = chip.dataset.venue;
    });

    // snapchat-style stories
    const openStoryFrom = (e) => {
      const bubble = e.target.closest('.story-bubble');
      if (!bubble) return;
      const sp = storyPeople().find((x) => x.id === bubble.dataset.story);
      if (sp) openStory(sp);
    };
    $('#storyStrip').addEventListener('click', openStoryFrom);
    $('#profileStories').addEventListener('click', openStoryFrom);
    $('#svClose').addEventListener('click', closeStory);
    $('#svTapLeft').addEventListener('click', svPrev);
    $('#svTapRight').addEventListener('click', svNext);
    $('#svReplySend').addEventListener('click', () => {
      const text = $('#svReply').value.trim();
      if (!text) return;
      toast(`💬 "${text}" sent to ${storyPerson ? (storyPerson.mine ? 'your story' : storyPerson.name) : 'the story'}!`, 'ok');
      $('#svReply').value = '';
    });
    $('#svReply').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('#svReplySend').click(); }
    });

    // person profile modal
    $('#personClose').addEventListener('click', closeModals);
    $('#ppYes').addEventListener('click', () => {
      const id = $('#ppYes').dataset.person;
      if (!id) return;
      const p = allPeople.find((x) => x.id === id) || peopleQueue[0];
      if (p) { closeModals(); openSuggestModal(p); }
    });

    // notifications
    $('#bellBtn').addEventListener('click', () => switchView('notifications'));
    $('#notifList').addEventListener('click', (e) => {
      const item = e.target.closest('.notif-item');
      if (!item) return;
      if (item.dataset.kind === 'chat') { switchView('inbox'); return; }
      if (item.dataset.id) openMeetupModal(item.dataset.id);
    });

    // filters
    $('#searchInput').addEventListener('input', () => { clearTimeout(window._searchT); window._searchT = setTimeout(loadMeetups, 250); });
    $('#sortFilter').addEventListener('change', loadMeetups);
    $('#hobbyFilter').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      if (chip.dataset.kind === 'venue') {
        filterVenue = chip.dataset.venue;
        $$('#hobbyFilter .venue-pill').forEach((c) => c.classList.toggle('selected', c === chip));
      } else {
        const hid = chip.dataset.hobby;
        const i = filterHobbies.indexOf(hid);
        if (i > -1) filterHobbies.splice(i, 1); else filterHobbies.push(hid);
        chip.classList.toggle('selected');
      }
      loadMeetups();
    });

    // chat list
    $('#chatList').addEventListener('click', (e) => {
      const conv = e.target.closest('.conv');
      if (conv) openThread(conv.dataset.thread);
    });

    // profile tabs + tiles
    document.addEventListener('click', (e) => {
      const ptab = e.target.closest('.ptab');
      if (ptab) { switchProfileTab(ptab.dataset.tab); return; }
      const tile = e.target.closest('[data-meetup-tile]');
      if (tile) {
        if (e.target.closest('[data-action]')) return;
        openMeetupModal(tile.dataset.meetupTile);
      }
    });

    // modals
    $('#meetupClose').addEventListener('click', closeModals);
    $('#createClose').addEventListener('click', closeModals);
    $('#locClose').addEventListener('click', closeModals);
    $('#meetupModal').addEventListener('click', (e) => { if (e.target === $('#meetupModal')) closeModals(); });
    $('#createModal').addEventListener('click', (e) => { if (e.target === $('#createModal')) closeModals(); });
    $('#locModal').addEventListener('click', (e) => { if (e.target === $('#locModal')) closeModals(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });

    $('#resetBtn').addEventListener('click', window.resetDemo);
    // CSP-safe (no inline handlers) — the profile empty-state buttons
    $('[data-action="reset-demo"]').addEventListener('click', window.resetDemo);
    $('[data-action="go-discover"]').addEventListener('click', () => switchView('discover'));
  }

  window.resetDemo = function () {
    if (!confirm('Reset the demo? This signs you out and clears local data on this browser.')) return;
    lsRemove(TOKEN_KEY);
    lsRemove(LS_KEY);
    lsRemove(LS_DB);
    lsRemove(SEEN_KEY);
    location.reload();
  };

  window.__wink = { doLogin, finishProfileSetup, enterApp, boot, localApi, openPersonModal, getLocalMode: () => localMode, getLocalDB: () => localDB };

  boot();
})();
