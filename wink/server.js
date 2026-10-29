/* ============================================================
   W.I.N.K — Node server (zero dependencies)
   Serves the demo UI + a REST API. Data persists in data/*.json.
   Run: node server.js  (or: npm start)
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

/* ---------------- persistence ---------------- */
function read(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')); }
  catch (e) { return fallback; }
}
/* index for O(1) mutual-counterpart lookups: key = title + '|' + organizerUserId */
let mutualIdx = new Map();

/* atomic write — temp file + rename, so a crash never corrupts the data */
function write(file, data) {
  const target = path.join(DATA_DIR, file);
  const tmp = target + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, target);
  if (file === 'meetups.json') rebuildMutualIndex();
}

const db = {
  users: read('users.json', []),
  sessions: read('sessions.json', {}),
  meetups: read('meetups.json', null),
  chats: read('chats.json', null),
};
db.chats = db.chats || {};
db.meetups = db.meetups || [];

/* self-heal the data on boot — never trust stored state blindly */
const SESSION_TTL = 30 * 24 * 3600 * 1000; // 30 days
const ONLINE_WINDOW = 5 * 60 * 1000; // a user is "online" if active in the last 5 minutes
function validateDb() {
  db.users = Array.isArray(db.users) ? db.users : [];
  db.sessions = db.sessions && typeof db.sessions === 'object' ? db.sessions : {};
  db.meetups = Array.isArray(db.meetups) ? db.meetups : [];
  db.chats = db.chats && typeof db.chats === 'object' ? db.chats : {};
  db.users = db.users.filter((u) => u && u.id && u.name);
  // migrate legacy string sessions { token: uid } → { token: { uid, expires } }
  for (const [tok, s] of Object.entries(db.sessions)) {
    if (typeof s === 'string') {
      db.sessions[tok] = { uid: s, expires: Date.now() + SESSION_TTL };
    } else if (!s || !s.uid || !s.expires) {
      delete db.sessions[tok];
    } else if (Date.now() > s.expires) {
      delete db.sessions[tok];
    }
  }
  db.meetups = db.meetups.filter((m) => m && m.id && m.title);
  db.meetups.forEach((m) => {
    m.hobbies = Array.isArray(m.hobbies) ? m.hobbies : [];
    m.participants = Array.isArray(m.participants) ? m.participants : [];
    m.reviews = Array.isArray(m.reviews) ? m.reviews : [];
    m.comments = Array.isArray(m.comments) ? m.comments : [];
    if (!m.organizer) m.organizer = { name: 'Unknown', initials: '?', hue: '#D96A4A', userId: null };
    if (!m.location) m.location = 'Café de la Place';
    if (!m.date || isNaN(new Date(m.date).getTime())) m.date = new Date().toISOString();
  });
  const meetIds = new Set(db.meetups.map((m) => m.id));
  Object.keys(db.chats).forEach((k) => { if (!meetIds.has(k)) delete db.chats[k]; }); // drop orphaned chats
  db.meetups.forEach((m) => { if (!db.chats[m.id]) db.chats[m.id] = []; });
}
validateDb();

const newId = (prefix) => prefix + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
const dayMs = 86400000;
const at = (dayOffset, hour, min = 0) => {
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return new Date(d.getTime() + dayOffset * dayMs);
};

/* ---------------- seed data ---------------- */
const HOBBIES = [
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

const VENUES = {
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

const SEEK = [
  'Friends to study with',
  'Friends to chill with',
  'Sports partner',
  'Creative collaborator',
  'Explore Monastir together',
  'Just someone to talk to',
];

/* people you can meet — profiles with hobbies, bio, general rate */
const PEOPLE = [
  { id: 'p1', name: 'Yasmine B.', handle: '@yasmine', hue: '#8A6B9E', initials: 'YB', instagram: 'yasmineb', photos: ['🎬', '📚', '🌅', '🎸', '🌊', '🏀'], bio: 'CS student who loves film nights and beach walks. Always up for a chat — never met a stranger.', hobbies: ['cinema', 'reading', 'travel', 'photography'], seek: 'Friends to chill with', rating: 4.8, meetsCount: 12, online: true },
  { id: 'p2', name: 'Amine T.', handle: '@amine', hue: '#6E8B7C', initials: 'AT', instagram: 'amine.t', photos: ['💻', '⚽', '🎮', '📚', '🌊', '🎵'], bio: 'Backend dev. Football on weekends, algorithms on weekdays. Will debate pizza toppings for hours.', hobbies: ['coding', 'football', 'gaming', 'study'], seek: 'Sports partner', rating: 4.6, meetsCount: 9, online: true },
  { id: 'p3', name: 'Sofia K.', handle: '@sofia', hue: '#BC527E', initials: 'SK', instagram: 'sofia.k', photos: ['📸', '🌅', '🎨', '🎬', '🍿', '🏖️'], bio: 'Photography student — sunset chaser and film grain lover. Looking for creative collaborators.', hobbies: ['photography', 'hiking', 'travel', 'drawing'], seek: 'Creative collaborator', rating: 4.9, meetsCount: 15, online: true },
  { id: 'p4', name: 'Hamza A.', handle: '@hamza', hue: '#D9A441', initials: 'HA', instagram: 'hamza.a', photos: ['⚽', '💪', '🏀', '🎮', '🍔', '🎵'], bio: 'Sports first, everything else second. Gym buddies welcome — all levels, no judgment.', hobbies: ['football', 'gym', 'basketball'], seek: 'Sports partner', rating: 4.5, meetsCount: 7, online: true },
  { id: 'p5', name: 'Ines M.', handle: '@ines', hue: '#4F7A94', initials: 'IM', instagram: 'ines.m', photos: ['📚', '✏️', '☕', '🎬', '🍩', '🌅'], bio: 'Study group regular and cinema club founder. Let’s ace this semester — and grab coffee after.', hobbies: ['study', 'cinema', 'coffee', 'reading'], seek: 'Friends to study with', rating: 4.7, meetsCount: 11, online: true },
  { id: 'p6', name: 'Karim R.', handle: '@karim', hue: '#C28A5C', initials: 'KR', instagram: 'karim.r', photos: ['🎮', '💻', '🕹️', '☕', '🎸', '🌃'], bio: 'Gaming nights and guitar riffs. Shy but friendly — say hi, I promise I bite less than my avatar.', hobbies: ['gaming', 'music', 'coding', 'coffee'], seek: 'Just someone to talk to', rating: 4.4, meetsCount: 6, online: true },
  { id: 'p7', name: 'Salma L.', handle: '@salma', hue: '#7C9466', initials: 'SL', instagram: 'salma.l', photos: ['🥾', '🌊', '🏐', '📸', '🍦', '🌅'], bio: 'Beach days and trail walks. New in Monastir — show me your favorite corner of the Corniche?', hobbies: ['hiking', 'travel', 'football', 'photography'], seek: 'Explore Monastir together', rating: 4.8, meetsCount: 10, online: true },
  { id: 'p8', name: 'Mohamed Amine S.', handle: '@amines', hue: '#D96A4A', initials: 'MS', instagram: 'amine.s', photos: ['💪', '⚽', '📚', '🎵', '🏊', '🍽️'], bio: 'Med student. Gym at 6am, then books all day. Looking for study buddies who fuel up properly.', hobbies: ['gym', 'football', 'study', 'music'], seek: 'Friends to study with', rating: 4.6, meetsCount: 8, online: true },
];

const POOL = [
  { name: 'Yasmine B.', hue: '#8A6B9E', initials: 'YB', instagram: 'yasmineb' },
  { name: 'Amine T.', hue: '#6E8B7C', initials: 'AT', instagram: 'amine.t' },
  { name: 'Sofia K.', hue: '#BC527E', initials: 'SK', instagram: 'sofia.k' },
  { name: 'Hamza A.', hue: '#D9A441', initials: 'HA', instagram: 'hamza.a' },
  { name: 'Ines M.', hue: '#4F7A94', initials: 'IM', instagram: 'ines.m' },
  { name: 'Karim R.', hue: '#C28A5C', initials: 'KR', instagram: 'karim.r' },
  { name: 'Salma L.', hue: '#7C9466', initials: 'SL', instagram: 'salma.l' },
  { name: 'Mohamed Amine S.', hue: '#D96A4A', initials: 'MS', instagram: 'amine.s' },
];

const SEED_REVIEWS = {
  m9: [
    { authorName: 'Yasmine B.', initials: 'YB', hue: '#8A6B9E', rating: 5, comment: 'So helpful! Met 2 people here, we now study together every week. 💛', date: at(-1, 18, 0) },
    { authorName: 'Karim R.', initials: 'KR', hue: '#C28A5C', rating: 5, comment: 'Clear explanations and a small group — perfect for a first meet.', date: at(-1, 19, 0) },
  ],
  m10: [
    { authorName: 'Hamza A.', initials: 'HA', hue: '#D9A441', rating: 4, comment: 'Nice vibe, small group felt safe. Would join again.', date: at(-3, 18, 30) },
    { authorName: 'Sofia K.', initials: 'SK', hue: '#BC527E', rating: 5, comment: 'Came alone, left with 3 new contacts. 10/10.', date: at(-3, 19, 0) },
  ],
};

const SEED_CHATS = {
  m1: [
    { authorName: 'Yasmine B.', initials: 'YB', hue: '#8A6B9E', text: "I'll bring the past papers 📚", date: new Date(Date.now() - 5 * 3600000) },
    { authorName: 'Karim R.', initials: 'KR', hue: '#C28A5C', text: 'Save me a seat 🧑💻', date: new Date(Date.now() - 2 * 3600000) },
  ],
  m3: [
    { authorName: 'Sofia K.', initials: 'SK', hue: '#BC527E', text: 'Camera ready 📸', date: new Date(Date.now() - 3 * 3600000) },
  ],
  m9: [
    { authorName: 'Yasmine B.', initials: 'YB', hue: '#8A6B9E', text: 'That DP problem broke my brain 🤯', date: new Date(Date.now() - 27 * 3600000) },
    { authorName: 'Amine T.', initials: 'AT', hue: '#6E8B7C', text: 'We cracked it! Next time: greedy algorithms 💪', date: new Date(Date.now() - 26 * 3600000) },
  ],
};

const SEED_COMMENTS = {
  m1: [
    { authorName: 'Yasmine B.', initials: 'YB', hue: '#8A6B9E', text: 'Past papers are in the shared folder 👇', date: at(0, 10, 0) },
    { authorName: 'Amine T.', initials: 'AT', hue: '#6E8B7C', text: 'Thanks! See you at 14:00 📚', date: at(0, 11, 0) },
  ],
  m3: [
    { authorName: 'Sofia K.', initials: 'SK', hue: '#BC527E', text: 'Sunset is at 18:40 — perfect timing 🌅', date: at(0, 12, 0) },
  ],
  m9: [
    { authorName: 'Karim R.', initials: 'KR', hue: '#C28A5C', text: 'Great session! When is the next one?', date: at(-1, 15, 0) },
    { authorName: 'Amine T.', initials: 'AT', hue: '#6E8B7C', text: 'Same time next week 💪', date: at(-1, 15, 30) },
  ],
  m11: [
    { authorName: 'Amine T.', initials: 'AT', hue: '#6E8B7C', text: 'The calculus problems were brutal — see you all there ☕', date: at(0, 9, 0) },
  ],
  m12: [
    { authorName: 'Salma L.', initials: 'SL', hue: '#7C9466', text: 'New topic every Friday — this week: travel stories in English 🌍', date: at(2, 10, 0) },
  ],
  m13: [
    { authorName: 'Karim R.', initials: 'KR', hue: '#C28A5C', text: 'Bringing Splendor and Ticket to Ride 🎲', date: at(1, 20, 0) },
  ],
};

function seed() {
  db.meetups = [
    { id: 'm1', title: 'Distributed Systems study session', desc: 'Exam prep group. We split the chapters, solve past papers together, and take a coffee break at 16:30.', hobbies: ['coding', 'study', 'coffee'], venueGroup: 'FSM', location: 'FSM — Bibliothèque universitaire', date: at(1, 14, 0), time: '14:00', capacity: 4, organizer: POOL[1], participants: [POOL[1], POOL[0], POOL[5]], createdByUser: false },
    { id: 'm2', title: 'Football 5v5 — student pitch', desc: 'Casual match, good vibes. Bring boots, water and a friend (or meet one there).', hobbies: ['football', 'gym'], venueGroup: 'FSM', location: 'FSM — Stade universitaire', date: at(0, 17, 0), time: '17:00', capacity: 10, organizer: POOL[3], participants: [POOL[3], POOL[4], POOL[6], POOL[7], POOL[2]], createdByUser: false },
    { id: 'm3', title: 'Corniche walk & sunset photos', desc: 'Easy walk along the Corniche + a small photo tour. Great for meeting people without pressure.', hobbies: ['photography', 'hiking', 'travel'], venueGroup: 'Monastir', location: 'Corniche de Monastir', date: at(0, 18, 30), time: '18:30', capacity: 6, organizer: POOL[2], participants: [POOL[2], POOL[0]], createdByUser: false },
    { id: 'm4', title: 'Game night — Mario Kart & snacks', desc: 'Chill evening, consoles provided. No skills needed, just laughs.', hobbies: ['gaming', 'anime', 'coffee'], venueGroup: 'Monastir', location: 'Café de la Place', date: at(2, 19, 30), time: '19:30', capacity: 6, organizer: POOL[5], participants: [POOL[5], POOL[1], POOL[3]], createdByUser: false },
    { id: 'm5', title: 'Cinema club — screening + debate', desc: 'We vote on a film on the day, watch it, then debate over tea.', hobbies: ['cinema', 'reading'], venueGroup: 'Monastir', location: 'Centre culturel Tahar Haddad', date: at(2, 20, 0), time: '20:00', capacity: 8, organizer: POOL[4], participants: [POOL[4], POOL[6], POOL[0], POOL[2]], createdByUser: false },
    { id: 'm6', title: 'Gym buddies — push day', desc: 'Bench, shoulders, arms. Spotters guaranteed. All levels welcome.', hobbies: ['gym', 'football'], venueGroup: 'FSM', location: 'FSM — Salle de sport', date: at(3, 17, 0), time: '17:00', capacity: 4, organizer: POOL[7], participants: [POOL[7], POOL[1]], createdByUser: false },
    { id: 'm7', title: 'Skikda beach frisbee afternoon', desc: 'Frisbee, sea breeze, maybe a swim. Meet at the entrance and walk down together.', hobbies: ['hiking', 'travel', 'football'], venueGroup: 'Monastir', location: 'Plage de Skikda', date: at(3, 15, 0), time: '15:00', capacity: 8, organizer: POOL[6], participants: [POOL[6], POOL[2], POOL[4], POOL[0]], createdByUser: false },
    { id: 'm8', title: 'Music jam — guitar & keyboards', desc: 'Bring any instrument or just listen. We play everything from govà to rock.', hobbies: ['music', 'coffee'], venueGroup: 'Monastir', location: 'Marina de Monastir', date: at(4, 19, 0), time: '19:00', capacity: 5, organizer: POOL[0], participants: [POOL[0], POOL[2], POOL[5]], createdByUser: false },
    { id: 'm9', title: 'Algorithms deep dive', desc: 'Sorting, DP and greedy — we covered past-paper problems for 2 hours.', hobbies: ['coding', 'study'], venueGroup: 'FSM', location: 'FSM — Bibliothèque universitaire', date: at(-1, 14, 0), time: '14:00', capacity: 4, organizer: POOL[1], participants: [POOL[1], POOL[0], POOL[5]], reviews: SEED_REVIEWS.m9, createdByUser: false },
    { id: 'm10', title: 'First hello: coffee & chats', desc: 'Small-group icebreaker meet. We played a game of "two truths, one lie".', hobbies: ['coffee', 'cinema'], venueGroup: 'Monastir', location: 'Café de la Place', date: at(-3, 17, 0), time: '17:00', capacity: 6, organizer: POOL[4], participants: [POOL[4], POOL[3], POOL[0]], reviews: SEED_REVIEWS.m10, createdByUser: false },
    { id: 'm11', title: 'Café math — past papers & coffee', desc: 'Bring your hardest problems — we solve them together over coffee from the cafétéria.', hobbies: ['study', 'coffee'], venueGroup: 'FSM', location: 'FSM — Cafétéria centrale', date: at(1, 15, 30), time: '15:30', capacity: 6, organizer: POOL[4], participants: [POOL[4], POOL[1], POOL[5]], createdByUser: false },
    { id: 'm12', title: 'English corner — Friday chats', desc: 'Casual English conversation for everyone. Topics on the board, newcomers welcome.', hobbies: ['reading', 'coffee'], venueGroup: 'FSM', location: 'FSM — Jardin des sciences', date: at(3, 16, 0), time: '16:00', capacity: 6, organizer: POOL[6], participants: [POOL[6], POOL[2], POOL[0]], createdByUser: false },
    { id: 'm13', title: 'Board game night — cafétéria tables', desc: 'Splendor, Ticket to Ride, Carcassonne… boards provided, just bring your friends (or make new ones).', hobbies: ['gaming', 'coffee'], venueGroup: 'FSM', location: 'FSM — Cafétéria centrale', date: at(2, 19, 30), time: '19:30', capacity: 8, organizer: POOL[2], participants: [POOL[2], POOL[5], POOL[7]], createdByUser: false },
  ];
  db.meetups.forEach((m) => {
    if (!m.reviews) m.reviews = [];
    m.date = m.date.toISOString();
    m.organizer = { ...m.organizer };
    m.participants = m.participants.map((p) => ({ ...p, userId: null }));
    m.createdAt = new Date(new Date(m.date).getTime() - 3600000).toISOString();
    m.comments = (SEED_COMMENTS[m.id] || []).map((c) => ({ ...c, date: c.date.toISOString() }));
  });

  db.chats = {};
  db.meetups.forEach((m) => {
    db.chats[m.id] = [{
      id: newId('msg'),
      authorName: m.organizer.name,
      initials: m.organizer.initials,
      hue: m.organizer.hue,
      text: `Hey! 👋 Welcome to "${m.title}". We meet at ${m.location} at ${m.time}.`,
      kind: 'text',
      date: new Date(new Date(m.date).getTime() - 3600000).toISOString(),
    }];
    (SEED_CHATS[m.id] || []).forEach((e) => {
      db.chats[m.id].push({ id: newId('msg'), kind: 'text', date: e.date.toISOString(), ...e });
    });
  });

  write('meetups.json', db.meetups);
  write('chats.json', db.chats);
}

if (!db.meetups || db.meetups.length === 0) seed();

/* ---------------- serialization ---------------- */
/* ---------------- serialization ---------------- */
function rebuildMutualIndex() {
  mutualIdx = new Map();
  for (const m of db.meetups) {
    if (m.organizer && m.organizer.userId) mutualIdx.set(m.title + '|' + m.organizer.userId, m);
  }
}
rebuildMutualIndex();

function mutualCounterpart(m, user) {
  if (!user || !m.organizer || !m.organizer.userId) return null;
  // case A: the organizer (the person being met) accepted — both are participants now
  if (m.participants.some((p) => p.userId === m.organizer.userId)) return m;
  const isOrganizer = m.organizer.userId === user.id;
  const other = isOrganizer
    ? (m.participants || []).find((p) => p.userId && p.userId !== user.id)
    : m.organizer;
  if (!other || !other.userId) return null;
  const wantTitle = 'Meetup with ' + (isOrganizer ? other.name : user.name);
  const wantOrg = isOrganizer ? other.userId : user.id;
  const cp = mutualIdx.get(wantTitle + '|' + wantOrg);
  if (!cp || cp.id === m.id) return null;
  return (cp.participants || []).some((p) => p.userId === (isOrganizer ? user.id : other.userId)) ? cp : null;
}

function shape(m, user) {
  const ended = new Date(m.date) < new Date();
  const match = user && user.hobbies && user.hobbies.length
    ? Math.round((m.hobbies.filter((t) => user.hobbies.includes(t)).length / m.hobbies.length) * 100)
    : null;
  const joinedByMe = !!(user && m.participants.some((p) => p.userId === user.id));
  const avg = m.reviews.length ? m.reviews.reduce((a, r) => a + r.rating, 0) / m.reviews.length : null;
  const cp = mutualCounterpart(m, user);
  return {
    id: m.id,
    title: m.title,
    desc: m.desc,
    hobbies: m.hobbies,
    venueGroup: m.venueGroup,
    location: m.location,
    date: m.date,
    time: m.time,
    capacity: m.capacity,
    organizer: m.organizer,
    participants: m.participants,
    reviews: m.reviews,
    comments: m.comments || [],
    createdByUser: m.createdByUser,
    createdAt: m.createdAt,
    status: ended ? 'ended' : 'upcoming',
    match,
    joinedByMe,
    avgRating: avg,
    mutual: !!cp,
    mutualMeetupId: cp ? cp.id : null,
    mutualLocationSet: !!m.mutualLocationSet,
    requestedForMe: !!(user && m.organizer && m.organizer.userId === user.id && !joinedByMe
      && m.title === 'Meetup with ' + user.name),
  };
}

/* ---------------- helpers ---------------- */
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}
function fail(res, code, msg) { json(res, code, { error: msg }); }
/* validated string — trim, cap length, always returns a string */
function str(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}
/* clean an @instagram handle — strip @, keep only valid chars */
function cleanInstagram(value) {
  return str(value, 30).replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '');
}
function authUser(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const s = db.sessions[m[1]];
  if (!s || typeof s !== 'object') return null; // legacy string sessions are invalid
  if (Date.now() > s.expires) { delete db.sessions[m[1]]; write('sessions.json', db.sessions); return null; }
  const u = db.users.find((x) => x.id === s.uid) || null;
  if (u) u.lastSeen = Date.now(); // presence — every authenticated request keeps you online
  return u;
}
/* is this person currently online? seeded people are always findable; real users by recent activity */
function isOnlineUser(u) {
  if (!u) return false;
  if (u.online === true) return true;
  return u.lastSeen && Date.now() - u.lastSeen < ONLINE_WINDOW;
}
function readBody(req, res) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) { // 1 MB cap — reject oversized payloads
        if (res && !res.headersSent) {
          res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Payload too large' }));
          // let the 413 flush before dropping the connection
          res.on('finish', () => req.destroy());
        } else {
          req.destroy();
        }
        return resolve(null);
      }
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); }
    });
    req.on('error', () => resolve(null));
  });
}
function venueGroupOf(venue) {
  const g = Object.keys(VENUES).find((k) => VENUES[k].includes(venue));
  return g || 'Monastir';
}

/* suggest a meeting spot based on what you both like */
function suggestVenue(person) {
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

function shapePerson(p, user, meets) {
  return {
    id: p.id, name: p.name, handle: p.handle, hue: p.hue, initials: p.initials,
    instagram: p.instagram || '',
    photos: p.photos, bio: p.bio, hobbies: p.hobbies, seek: p.seek,
    rating: p.rating, meetsCount: p.meetsCount,
    online: isOnlineUser(p),
    suggestedVenue: suggestVenue(p),
    ...(meets ? { meets } : {}),
  };
}

/* shape a real user as a candidate for others (like the seeded people) */
function shapeUser(u, user) {
  const hostedMeets = db.meetups.filter((m) => m.organizer && m.organizer.userId === u.id);
  const hosted = hostedMeets.filter((m) => m.reviews.length);
  const rating = hosted.length ? hosted.reduce((a, m) => a + m.reviews.reduce((s, r) => s + r.rating, 0) / m.reviews.length, 0) / hosted.length : null;
  const meetsCount = hostedMeets.length;
  return {
    id: u.id, name: u.name, handle: u.handle, hue: u.hue, initials: u.initials,
    instagram: u.instagram || '',
    photos: u.photos, bio: u.bio || 'New on W.I.N.K — say hi!', hobbies: u.hobbies || [], seek: u.seek || '',
    rating, meetsCount,
    online: isOnlineUser(u),
    suggestedVenue: suggestVenue(u),
    meets: hostedMeets.slice(0, 3).map((m) => shape(m, user)),
  };
}

/* ---------------- API ---------------- */
/* simple in-memory rate limiter (per IP, sliding window) — brute-force protection */
const RATE = new Map();
const RATE_LIMIT = 30; // requests (auth-sensitive endpoints)
const RATE_LIMIT_WRITE = 60; // general write endpoints per window
const RATE_WINDOW = 60000; // ms
function rateLimited(ip, limit = RATE_LIMIT) {
  const now = Date.now();
  const fresh = (RATE.get(ip) || []).filter((t) => now - t < RATE_WINDOW);
  if (fresh.length >= limit) { RATE.set(ip, fresh); return true; }
  fresh.push(now);
  RATE.set(ip, fresh);
  return false;
}
/* auth-sensitive endpoints keep their own stricter limit — excluded from the general write limiter */
const STRICT_LIMITED = new Set(['/api/login', '/api/onboard', '/api/profile/instagram']);

function apiStats(req, res) {
  const now = new Date();
  const upcoming = db.meetups.filter((m) => new Date(m.date) >= now);
  const byVenue = {};
  const byHobby = {};
  db.meetups.forEach((m) => {
    byVenue[m.venueGroup] = (byVenue[m.venueGroup] || 0) + 1;
    (m.hobbies || []).forEach((h) => { byHobby[h] = (byHobby[h] || 0) + 1; });
  });
  const rated = db.meetups.filter((m) => m.reviews.length);
  const avgRating = rated.length
    ? rated.reduce((a, m) => a + m.reviews.reduce((s, r) => s + r.rating, 0) / m.reviews.length, 0) / rated.length
    : null;
  json(res, 200, {
    users: db.users.length,
    meetups: db.meetups.length,
    upcoming: upcoming.length,
    byVenue,
    byHobby,
    avgRating,
    messages: Object.values(db.chats).reduce((a, t) => a + (t ? t.length : 0), 0),
  });
}

function apiHealth(req, res) {
  json(res, 200, {
    ok: true,
    uptime: Math.round(process.uptime()),
    users: db.users.length,
    meetups: db.meetups.length,
    chats: Object.keys(db.chats).length,
  });
}

async function apiLogin(req, res) {
  const body = await readBody(req);
  if (body === null) return; // 413 already sent
  if (!body || typeof body !== 'object') return fail(res, 400, 'Invalid request body');
const name = str(body.name, 40);
  const ig = cleanInstagram(body.instagram);
  if (!name) return fail(res, 400, 'Please enter your name');
  if (ig && !/^[A-Za-z0-9._-]+$/.test(ig)) return fail(res, 400, 'Invalid Instagram handle');
  const words = name.split(/\s+/);
  const initials = (((words[0] || 'W')[0] || '') + ((words[1] || '')[0] || '')).toUpperCase();
  // one account per Instagram — the handle is the account key; legacy accounts can still sign in by name
  let user = ig ? db.users.find((u) => u.instagram && u.instagram.toLowerCase() === ig.toLowerCase()) : null;
  if (!user) user = db.users.find((u) => u.name.toLowerCase() === name.toLowerCase()); // legacy name fallback
  if (!user) {
    if (!ig) return fail(res, 400, 'Please enter your @instagram'); // new accounts need it
    user = {
      id: newId('u'),
      name,
      initials,
      handle: '', // @instagram is set at login — never derived from the name
      instagram: ig,
      hue: POOL[db.users.length % POOL.length].hue,
      bio: '',
      hobbies: [],
      seek: '',
      photos: ['📚', '🌅', '🎸', '🏀', '🎬', '🌊'].sort(() => Math.random() - 0.5),
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
  } else {
    if (!user.instagram && ig) user.instagram = ig; // legacy account claims its handle
  }
  user.lastSeen = Date.now(); // signing in puts you online
  // session hygiene — a new login replaces old sessions for this user
  for (const [tok, s] of Object.entries(db.sessions)) {
    if (s && s.uid === user.id) delete db.sessions[tok];
  }
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = { uid: user.id, expires: Date.now() + SESSION_TTL };
  write('users.json', db.users);
  write('sessions.json', db.sessions);
  json(res, 200, { token, user });
}

function apiMe(req, res) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  json(res, 200, { user: u });
}

async function apiOnboard(req, res) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  const body = await readBody(req);
  if (body === null) return; // 413 already sent
  if (!body || typeof body !== 'object') return fail(res, 400, 'Invalid request body');
u.hobbies = Array.isArray(body.hobbies) ? body.hobbies.slice(0, 12).map((h) => str(h, 24).toLowerCase()).filter(Boolean) : [];
  u.seek = str(body.seek, 140);
  if (str(body.bio, 140)) u.bio = str(body.bio, 140);
  u.instagram = cleanInstagram(body.instagram);
  if (Array.isArray(body.photos)) u.photos = body.photos.slice(0, 6);
  write('users.json', db.users);
  json(res, 200, { user: u });
}

/* set / update the user's @instagram handle (used from the profile page) */
async function apiSetInstagram(req, res) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  const body = await readBody(req);
  if (body === null) return; // 413 already sent
  if (!body || typeof body !== 'object') return fail(res, 400, 'Invalid request body');
const ig = cleanInstagram(body.instagram);
  if (ig && !/^[A-Za-z0-9._-]+$/.test(ig)) return fail(res, 400, 'Invalid Instagram handle');
  if (ig) {
    // one account per Instagram — the handle can't belong to two accounts
    const taken = db.users.find((x) => x.id !== u.id && x.instagram && x.instagram.toLowerCase() === ig.toLowerCase());
    if (taken) return fail(res, 409, 'That @instagram is already taken — one account per instagram');
  }
  u.instagram = ig;
  write('users.json', db.users);
  json(res, 200, { user: u });
}

function apiMeta(req, res) {
  json(res, 200, { hobbies: HOBBIES, venues: VENUES, seek: SEEK });
}

async function apiMeetups(req, res, url) {
  const u = authUser(req);
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const venue = url.searchParams.get('venue') || 'all';
  const sort = url.searchParams.get('sort') || 'match';
  const hobby = (url.searchParams.get('hobby') || '').split(',').filter(Boolean);

  let list = db.meetups.filter((m) => {
    if (venue !== 'all' && m.venueGroup !== venue) return false;
    if (hobby.length && !m.hobbies.some((t) => hobby.includes(t))) return false;
    if (q) {
      const hay = (m.title + ' ' + m.desc + ' ' + m.location + ' ' + m.hobbies.join(' ')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const shaped = list.map((m) => shape(m, u)); // shape once — sorting reads cached fields
  if (sort === 'match') shaped.sort((a, b) => (b.match || 0) - (a.match || 0));
  else if (sort === 'soon') shaped.sort((a, b) => new Date(a.date) - new Date(b.date));
  else if (sort === 'top') shaped.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));

  json(res, 200, { meetups: shaped });
}

async function apiCreateMeetup(req, res) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  const body = await readBody(req);
  if (body === null) return; // 413 already sent
  if (!body || typeof body !== 'object') return fail(res, 400, 'Invalid request body');
const title = str(body.title, 120);
  if (!title) return fail(res, 400, 'Give your meet a title');
  const hobbies = Array.isArray(body.hobbies) ? body.hobbies.filter((t) => HOBBIES.some((h) => h.id === t)) : [];
  if (!hobbies.length) return fail(res, 400, 'Pick at least one hobby');
  const location = str(body.location, 120);
  if (!location) return fail(res, 400, 'Pick a place');
  if (!body.date || !body.time) return fail(res, 400, 'Pick a date and time');
  const dt = new Date(body.date + 'T' + body.time);
  if (isNaN(dt.getTime())) return fail(res, 400, 'Pick a valid date and time');
  if (dt.getTime() < Date.now() - 60000) return fail(res, 400, 'Pick a date in the future');

  const meetup = {
    id: newId('m'),
    title,
    desc: str(body.desc, 300) || 'Come as you are — new faces welcome.',
    hobbies,
    venueGroup: venueGroupOf(location),
    location,
    date: dt.toISOString(),
    time: body.time,
    capacity: Math.min(12, Math.max(2, Number(body.capacity) || 6)),
    organizer: { name: u.name, initials: u.initials, hue: u.hue, userId: u.id },
    participants: [{ name: u.name, initials: u.initials, hue: u.hue, userId: u.id }],
    reviews: [],
    comments: [],
    createdAt: new Date().toISOString(),
    createdByUser: true,
  };
  db.meetups.unshift(meetup);
  if (!db.chats[meetup.id]) db.chats[meetup.id] = [];
  write('meetups.json', db.meetups);
  write('chats.json', db.chats);
  json(res, 200, { meetup: shape(meetup, u) });
}

function findMeetup(id) { return db.meetups.find((m) => m.id === id); }

async function apiJoin(req, res, id) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  const m = findMeetup(id);
  if (!m) return fail(res, 404, 'Meetup not found');
  if (!m.participants.some((p) => p.userId === u.id)) {
    m.participants.push({ name: u.name, initials: u.initials, hue: u.hue, userId: u.id });
    write('meetups.json', db.meetups);
  }
  if (!db.chats[m.id]) db.chats[m.id] = [];
  write('chats.json', db.chats);
  json(res, 200, { meetup: shape(m, u) });
}

async function apiLeave(req, res, id) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  const m = findMeetup(id);
  if (!m) return fail(res, 404, 'Meetup not found');
  if (!m.participants.some((p) => p.userId === u.id)) return fail(res, 403, 'You are not in this meet');
  m.participants = m.participants.filter((p) => p.userId !== u.id);
  write('meetups.json', db.meetups);
  json(res, 200, { meetup: shape(m, u) });
}

async function apiReview(req, res, id) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  const m = findMeetup(id);
  if (!m) return fail(res, 404, 'Meetup not found');
  if (!m.participants.some((p) => p.userId === u.id)) return fail(res, 403, 'Only participants can review this meet');
  const body = await readBody(req);
  if (body === null) return; // 413 already sent
  if (!body || typeof body !== 'object') return fail(res, 400, 'Invalid request body');
const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5)));
  const comment = str(body.comment, 300) || 'Nice meet, thanks!';
  m.reviews.push({
    authorName: u.name,
    initials: u.initials,
    hue: u.hue,
    rating,
    comment,
    date: new Date().toISOString(),
  });
  write('meetups.json', db.meetups);
  json(res, 200, { meetup: shape(m, u) });
}

async function apiComment(req, res, id) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  const m = findMeetup(id);
  if (!m) return fail(res, 404, 'Meetup not found');
  if (!m.participants.some((p) => p.userId === u.id)) return fail(res, 403, 'Only participants can comment on this meet');
  const body = await readBody(req);
  if (body === null) return; // 413 already sent
  if (!body || typeof body !== 'object') return fail(res, 400, 'Invalid request body');
const text = str(body.text, 500);
  if (!text) return fail(res, 400, 'Write something first');
  m.comments = m.comments || [];
  m.comments.push({
    authorName: u.name,
    initials: u.initials,
    hue: u.hue,
    text,
    date: new Date().toISOString(),
  });
  write('meetups.json', db.meetups);
  json(res, 200, { meetup: shape(m, u) });
}

async function apiAgain(req, res, id) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  const m = findMeetup(id);
  if (!m) return fail(res, 404, 'Meetup not found');
  if (!m.participants.some((p) => p.userId === u.id)) return fail(res, 403, 'Only participants can schedule a round 2');
  const again = {
    id: newId('m'),
    title: m.title + ' — Round 2',
    desc: 'Same vibe, new date. We loved the last meet — join us again!',
    hobbies: [...m.hobbies],
    venueGroup: m.venueGroup,
    location: m.location,
    date: new Date(new Date(m.date).getTime() + 7 * dayMs).toISOString(),
    time: m.time,
    capacity: m.capacity,
    organizer: { ...m.organizer },
    participants: m.participants.map((p) => ({ ...p, userId: p.userId || null })),
    reviews: [],
    comments: [],
    createdAt: new Date().toISOString(),
    createdByUser: true,
  };
  if (!again.participants.some((p) => p.userId === u.id)) again.participants.unshift({ name: u.name, initials: u.initials, hue: u.hue, userId: u.id });
  db.meetups.unshift(again);
  db.chats[again.id] = [];
  write('meetups.json', db.meetups);
  write('chats.json', db.chats);
  json(res, 200, { meetup: shape(again, u) });
}

async function apiMeetupLocation(req, res, id) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  const m = findMeetup(id);
  if (!m) return fail(res, 404, 'Meetup not found');
  const body = await readBody(req);
  if (body === null) return; // 413 already sent
  if (!body || typeof body !== 'object') return fail(res, 400, 'Invalid request body');
const location = str(body.location, 120);
  if (!location) return fail(res, 400, 'Pick a place');
  m.location = location;
  m.venueGroup = venueGroupOf(location);
  m.mutualLocationSet = true;
  const cp = mutualCounterpart(m, u);
  if (cp) { cp.location = location; cp.venueGroup = m.venueGroup; cp.mutualLocationSet = true; }
  write('meetups.json', db.meetups);
  json(res, 200, { meetup: shape(m, u) });
}

function apiMine(req, res) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  const joined = db.meetups.filter((m) => m.participants.some((p) => p.userId === u.id));
  json(res, 200, {
    upcoming: joined.filter((m) => new Date(m.date) >= new Date()).map((m) => shape(m, u)),
    past: joined.filter((m) => new Date(m.date) < new Date()).map((m) => shape(m, u)),
  });
}

function apiPeople(req, res) {
  const u = authUser(req);
  const people = PEOPLE.map((p) => shapePerson(p, u))
    .concat(db.users.filter((x) => !u || x.id !== u.id).map((x) => shapeUser(x, u)))
    .filter((p) => p.online); // only people who are online right now
  json(res, 200, { people });
}

function apiPerson(req, res, id) {
  const u = authUser(req);
  const seeded = PEOPLE.find((x) => x.id === id);
  if (seeded) {
    const meets = db.meetups.filter((m) => m.organizer.name === seeded.name).slice(0, 3).map((m) => shape(m, u));
    return json(res, 200, { person: shapePerson(seeded, u, meets) });
  }
  const real = db.users.find((x) => x.id === id);
  if (!real) return fail(res, 404, 'Person not found');
  json(res, 200, { person: shapeUser(real, u) });
}

async function apiPersonMeet(req, res, id) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  const seeded = PEOPLE.find((x) => x.id === id);
  const p = seeded || db.users.find((x) => x.id === id);
  if (!p) return fail(res, 404, 'Person not found');
  const body = await readBody(req);
  if (body === null) return; // 413 already sent
  if (!body || typeof body !== 'object') return fail(res, 400, 'Invalid request body');
const location = String(body.location || '').trim();
  if (!location) return fail(res, 400, 'Pick a place');
  if (!body.date || !body.time) return fail(res, 400, 'Pick a date and time');
  const dt = new Date(body.date + 'T' + body.time);
  if (isNaN(dt.getTime())) return fail(res, 400, 'Pick a valid date and time');

  const dup = db.meetups.find((m) => m.title === 'Meetup with ' + p.name && m.participants.some((x) => x.userId === u.id) && new Date(m.date) >= new Date());
  if (dup) return json(res, 200, { meetup: shape(dup, u) });

  const meetup = {
    id: newId('m'),
    title: 'Meetup with ' + p.name,
    desc: p.seek ? 'Connected on W.I.N.K — ' + p.seek + '. Say hi in the chat!' : 'Connected on W.I.N.K — say hi in the chat!',
    hobbies: (p.hobbies || []).slice(0, 2),
    venueGroup: venueGroupOf(location),
    location,
    date: dt.toISOString(),
    time: body.time,
    capacity: 4,
    organizer: { name: p.name, initials: p.initials, hue: p.hue, userId: seeded ? null : p.id },
    participants: [{ name: u.name, initials: u.initials, hue: u.hue, userId: u.id }],
    reviews: [], comments: [],
    createdAt: new Date().toISOString(),
    createdByUser: true,
    requestedFor: null,
  };
  // if the other side already said yes to you, this meetup is mutual — no pending request
  if (!mutualCounterpart(meetup, u)) meetup.requestedFor = seeded ? null : p.id;
  db.meetups.unshift(meetup);
  const welcome = mutualCounterpart(meetup, u)
    ? { authorName: p.name, initials: p.initials, hue: p.hue, text: 'Hey! 👋 So excited — see you at ' + location + ' at ' + body.time + '!' }
    : { authorName: u.name, initials: u.initials, hue: u.hue, text: "Hey! 👋 I'd love to meet you — see you at " + location + " at " + body.time + "!" };
  db.chats[meetup.id] = [{
    id: newId('msg'),
    kind: 'text',
    date: new Date().toISOString(),
    ...welcome,
  }];
  write('meetups.json', db.meetups);
  write('chats.json', db.chats);
  json(res, 200, { meetup: shape(meetup, u) });
}

/* accept a meetup that was requested for you — you join, and it becomes mutual */
async function apiAccept(req, res, id) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  const m = db.meetups.find((x) => x.id === id);
  if (!m) return fail(res, 404, 'Meetup not found');
  const isTarget = m.organizer && m.organizer.userId === u.id
    && m.title === 'Meetup with ' + u.name;
  if (!isTarget) return fail(res, 403, 'This meetup was not requested for you');
  if (m.participants.some((p) => p.userId === u.id)) return fail(res, 400, 'You are already part of this meet');
  if (m.participants.length >= m.capacity) return fail(res, 400, 'This meet is full');
  m.participants.push({ name: u.name, initials: u.initials, hue: u.hue, userId: u.id });
  m.requestedFor = null;
  m.mutual = true; // both sides said yes now
  write('meetups.json', db.meetups);
  json(res, 200, { meetup: shape(m, u) });
}

/* decline a meetup that was requested for you — it's cancelled for both sides */
async function apiDecline(req, res, id) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  const idx = db.meetups.findIndex((x) => x.id === id);
  if (idx < 0) return fail(res, 404, 'Meetup not found');
  const m = db.meetups[idx];
  const isTarget = m.organizer && m.organizer.userId === u.id
    && m.title === 'Meetup with ' + u.name;
  if (!isTarget) return fail(res, 403, 'This meetup was not requested for you');
  db.meetups.splice(idx, 1);
  delete db.chats[id];
  write('meetups.json', db.meetups);
  write('chats.json', db.chats);
  json(res, 200, { ok: true });
}

function apiChatsGet(req, res, id) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  if (!findMeetup(id)) return fail(res, 404, 'Meetup not found');
  json(res, 200, { messages: db.chats[id] || [] });
}

async function apiChatsPost(req, res, id) {
  const u = authUser(req);
  if (!u) return fail(res, 401, 'Not signed in');
  if (!findMeetup(id)) return fail(res, 404, 'Meetup not found');
  const body = await readBody(req);
  if (body === null) return; // 413 already sent
  if (!body || typeof body !== 'object') return fail(res, 400, 'Invalid request body');
if (!db.chats[id]) db.chats[id] = [];
  const msg = {
    id: newId('msg'),
    authorName: u.name,
    initials: u.initials,
    hue: u.hue,
    date: new Date().toISOString(),
  };
  if (body.kind === 'location') {
    msg.kind = 'location';
    msg.location = str(body.location, 120);
    msg.time = str(body.time, 8);
    msg.note = str(body.note, 140);
    if (!msg.location) return fail(res, 400, 'Pick a place to send');
  } else {
    msg.kind = 'text';
    msg.text = str(body.text, 500);
    if (!msg.text) return fail(res, 400, 'Write something first');
  }
  db.chats[id].push(msg);
  write('chats.json', db.chats);
  json(res, 200, { message: msg });
}

/* ---------------- static ---------------- */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(res, pathname, method) {
  const file = pathname === '/' ? '/index.html' : pathname === '/app' ? '/app.html' : pathname;
  // reject traversal attempts (raw or percent-encoded) — defense in depth
  let decoded = file;
  try { decoded = decodeURIComponent(file); } catch (e) { decoded = file; }
  if (decoded.includes('..') || decoded.includes('\\') || decoded.includes('\0')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' }); res.end('Forbidden'); return;
  }
  const full = path.normalize(path.join(PUBLIC_DIR, file));
  if (!full.startsWith(PUBLIC_DIR)) { res.writeHead(403, { 'Content-Type': 'text/plain' }); res.end('Forbidden'); return; }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(method === 'HEAD' ? undefined : data);
  });
}

/* ---------------- router ---------------- */
function handleRequest(req, res) {
  const t0 = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - t0;
    console.log(`${req.method} ${req.url} → ${res.statusCode} (${ms}ms)`);
  });
  // ---- security headers on every response (defense in depth) ----
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // CSP: everything self-contained — blocks external scripts/styles/fonts/connect
  // (no frame-ancestors directive — the demo runs inside an embedded preview iframe)
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; " +
    "object-src 'none'; base-uri 'none'");
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const segs = p.split('/').filter(Boolean); // ['api','meetups','m1','join']

  if (!p.startsWith('/api/')) return serveStatic(res, p, req.method);

  try {
    // general write-endpoint rate limit (60/min per IP) — auth endpoints have their own
    if (req.method === 'POST' && !STRICT_LIMITED.has(p) && rateLimited(req.socket.remoteAddress, RATE_LIMIT_WRITE)) {
      return fail(res, 429, 'Too many requests — slow down');
    }
    if (req.method === 'POST' && p === '/api/login') {
      if (rateLimited(req.socket.remoteAddress)) return fail(res, 429, 'Too many attempts — wait a moment');
      return apiLogin(req, res);
    }
    if (req.method === 'GET' && p === '/api/me') return apiMe(req, res);
    if (req.method === 'POST' && p === '/api/onboard') {
      if (rateLimited(req.socket.remoteAddress)) return fail(res, 429, 'Too many attempts — wait a moment');
      return apiOnboard(req, res);
    }
    if (req.method === 'POST' && p === '/api/profile/instagram') {
      if (rateLimited(req.socket.remoteAddress)) return fail(res, 429, 'Too many attempts — wait a moment');
      return apiSetInstagram(req, res);
    }
    if (req.method === 'GET' && p === '/api/meta') return apiMeta(req, res);
    if (req.method === 'GET' && p === '/api/meetups') return apiMeetups(req, res, url);
    if (req.method === 'POST' && p === '/api/meetups') return apiCreateMeetup(req, res);
    if (req.method === 'GET' && p === '/api/meetups/mine') return apiMine(req, res);
    if (req.method === 'GET' && p === '/api/people') return apiPeople(req, res);
    if (req.method === 'GET' && p === '/api/venues') return json(res, 200, VENUES);
    if (req.method === 'GET' && p === '/api/health') return apiHealth(req, res);
    if (req.method === 'GET' && p === '/api/stats') return apiStats(req, res);

    if (segs[1] === 'people' && segs[2]) {
      const id = segs[2];
      if (req.method === 'POST' && segs[3] === 'meet') return apiPersonMeet(req, res, id);
      if (req.method === 'GET') return apiPerson(req, res, id);
    }

    if (segs[1] === 'meetups' && segs[2]) {
      const id = segs[2];
      const action = segs[3];
      if (req.method === 'POST' && action === 'join') return apiJoin(req, res, id);
      if (req.method === 'POST' && action === 'leave') return apiLeave(req, res, id);
      if (req.method === 'POST' && action === 'review') return apiReview(req, res, id);
      if (req.method === 'POST' && action === 'comments') return apiComment(req, res, id);
      if (req.method === 'POST' && action === 'again') return apiAgain(req, res, id);
      if (req.method === 'POST' && action === 'location') return apiMeetupLocation(req, res, id);
      if (req.method === 'POST' && action === 'accept') return apiAccept(req, res, id);
      if (req.method === 'POST' && action === 'decline') return apiDecline(req, res, id);
    }
    if (segs[1] === 'chats' && segs[2]) {
      const id = segs[2];
      if (req.method === 'GET' && !segs[3]) return apiChatsGet(req, res, id);
      if (req.method === 'POST' && segs[3] === 'messages') return apiChatsPost(req, res, id);
    }
    return fail(res, 404, 'Unknown API route');
  } catch (err) {
    console.error(err);
    return fail(res, 500, 'Internal server error'); // no internals leaked to clients
  }
}

const server = http.createServer((req, res) => handleRequest(req, res));

/* handle Expect: 100-continue — reject oversized bodies before the client streams them */
server.on('checkContinue', (req, res) => {
  const len = Number(req.headers['content-length'] || 0);
  if (len > 1e6) {
    res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Payload too large' }));
    req.destroy();
    return;
  }
  res.writeHead(100);
  res.end();
  handleRequest(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`W.I.N.K server running → http://localhost:${PORT}  (landing)  |  http://localhost:${PORT}/app  (demo app)`);
});

/* graceful shutdown — finish in-flight requests, then exit */
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n${sig} — shutting down…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500); // hard exit if connections linger
  });
}
