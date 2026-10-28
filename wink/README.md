# W.I.N.K 🤝

**No friends? No problem.** A demo app that connects students at **FSM (Faculté des Sciences de Monastir)** and **Monastir** with new people — a modern, people-first social app (like Instagram profiles + a "Yes" to meet flow), so every first meet feels easy and safe.

## Architecture (Node, zero dependencies)

```
wink/
├── server.js           # Node HTTP server + REST API + JSON persistence (no npm deps)
├── package.json
├── Dockerfile          # container build (node:20-alpine) + healthcheck
├── .dockerignore
├── data/               # auto-created at boot: users, sessions, meetups, chats (.json)
└── public/             # frontend (static)
    ├── index.html      # Landing — presentation deck intro (6 animated slides)
    ├── app.html        # Demo app — login, Discover (Yes flow), meets, chat, ratings
    ├── css/landing.css # Dark glassmorphic deck theme
    ├── css/app.css     # Light glassmorphic app theme
    ├── js/landing.js   # Deck animations
    └── js/app.js       # App logic (API-driven, offline-mode capable)
```

## Run

```bash
node server.js        # or: npm start   (PORT env respected, default 8000)
# Landing deck → http://localhost:8000
# Demo app      → http://localhost:8000/app
```

Works with any Node ≥ 18. No `npm install` needed — zero dependencies.

### Docker

```bash
docker build -t wink .
docker run -p 8000:8000 -v $(pwd)/data:/app/data wink
# healthcheck → GET /api/health
```

## REST API

| Method | Route | What |
|---|---|---|
| POST | `/api/login` | Sign in with a name → token + mock Instagram profile |
| GET | `/api/me` | Current user |
| POST | `/api/onboard` | Save hobbies + what you're looking for + profile photos + bio + @instagram |
| POST | `/api/profile/instagram` | Set / update your @instagram handle (linked from the profile page) |
| GET | `/api/meta` | Hobbies, venues (FSM/Monastir), seek options |
| GET | `/api/venues` | Venues by area |
| GET | `/api/meetups` | List (filters: `q`, `venue`, `hobby`, `sort`) |
| POST | `/api/meetups` | Create a meet (place + time + hobbies) |
| POST | `/api/meetups/:id/join` `/leave` `/review` `/again` | Meet lifecycle |
| POST | `/api/meetups/:id/comments` | Post an inline discussion comment |
| GET | `/api/meetups/mine` | Your upcoming / past meets |
| GET | `/api/people` | Discover candidates (all people, neutral order) |
| GET | `/api/people/:id` | Person profile + meets |
| POST | `/api/people/:id/meet` | Yes → create meetup + open chat |
| GET/POST | `/api/chats/:id` `/api/chats/:id/messages` | Group chat messages |
| GET | `/api/health` | Liveness: `{ok, uptime, users, meetups, chats}` |
| GET | `/api/stats` | Aggregate analytics (users, upcoming/ended, by venue, by hobby, avg rating, messages) |

Data persists in `data/*.json` — restart the server and everything is still there.

## Engineering notes

**Data layer**
- Atomic writes (temp file + rename) — a crash never corrupts a data file.
- `validateDb()` self-heal on boot: drops records without id/title, normalizes arrays,
  repairs organizer/location/date, drops orphaned chats, backfills empty chat threads.
- Fresh-boot seeding when `meetups.json` is missing/empty (m1–m10 demo meets + chats).
- Session hygiene: a new login replaces old sessions for that user (single active session).
- Input validation helper `str(value, max)` on every write endpoint (title ≤ 120,
  bio/seek ≤ 140, desc ≤ 300, comment ≤ 300, chat text ≤ 500, location ≤ 120).
- Mutual-counterpart index (`title|organizerUserId` map) → O(1) mutual-meet lookups.
- Per-IP rate limiting (sliding window, 30/min) on login/onboard — brute-force protection.

**Security**
- Bearer-token sessions with random 24-byte hex tokens and a 30-day TTL (expired
  sessions purged on boot; legacy string sessions migrated). A new login replaces old
  sessions for that user (single active session).
- Input validation helper `str(value, max)` on every write endpoint (title ≤ 120,
  bio/seek ≤ 140, desc ≤ 300, comment ≤ 300, chat text ≤ 500, location ≤ 120).
- Rate limiting (per-IP, sliding window): 30/min on auth endpoints (login/onboard/
  profile-instagram), 60/min on all other write endpoints — brute-force + spam protection.
- 1 MB request-body cap with a clean `413` (including correct `Expect: 100-continue`
  handling — oversized bodies rejected before they stream).
- Security headers on every response: `Content-Security-Policy` (self-contained —
  blocks external scripts/styles/fonts/connections), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `X-XSS-Protection`, `Permissions-Policy` (geolocation/mic/camera off),
  `Cross-Origin-Opener-Policy`, `X-Permitted-Cross-Domain-Policies`.
- Static file serving rejects path traversal (raw and percent-encoded `..`, `\`, null
  bytes) — defense in depth alongside the `PUBLIC_DIR` root check.
- Internal errors never leak to clients (generic 500; details logged server-side only).
- Frontend escapes all user content (no raw innerHTML interpolation) — XSS-safe rendering;
  inline event handlers removed so `script-src 'self'` holds with zero `unsafe-inline`.
- Safe localStorage layer in the app (JSON parse guarded, quota errors handled).
- Container runs as a non-root user (least privilege).

**DevOps**
- `Dockerfile` (node:20-alpine, zero-dependency install, non-root user, `HEALTHCHECK`
  against `/api/health`), `.dockerignore`, `.gitignore`, `PORT` env respected,
  stateless restarts.
- Aggregate analytics via `GET /api/stats` for monitoring and data-science exploration.

## Demo flow

> **Works anywhere**: if the app can't reach the server (e.g. opened as a static file copy), it automatically switches to **offline demo mode** — same demo, data saved in the browser. When opened via the running server (`http://localhost:8000/app`), it uses the server.

1. Open `http://localhost:8000` — the presentation deck (hero → stats → how it works → features → places map → CTA)
2. Click **Open the demo app** → **sign in with a name** → step 2 builds your **Instagram-style profile** (pick 6 photos, write a bio, vibe + hobbies) — this profile always shows in your Profile tab and to anyone who discovers you. Sign in again with another name in a second tab and you'll appear as a candidate in each other's **Discover** (with ✨ New face until you host a reviewed meet).
3. **Discover** — one person at a time: their hobbies, bio, photo grid and general rate ⭐. Tap **Yes** → the app suggests a meeting spot based on what you both like → confirm or pick another → the meet is created and the chat opens. Tap the person for their Instagram-style profile.
4. **Meets** — your plans (upcoming / past, rate + 🔁 meet again) + browse all meetups with search & filters
5. **Notifications** 🔔 — bell badge for new participants, new comments, new meets, unread chats
6. **Inbox** — DM-style conversations per meetup; send text, **📍 location cards**, 👍 reactions; polls live every 3s (open two tabs to chat across them)
7. **Profile** — Instagram-style: story highlights, stats, Posts / Meets / Reviews tabs, photo grid — **↺ Reset demo** signs out

## Roadmap to the real app
- Real Instagram OAuth + JWT + PostgreSQL
- Push notifications & real-time chat (WebSockets)
- Live map with venue pins & geolocation
- Reporting / moderation flow for safer meetups
- Mobile-native build

Made for FSM & Monastir. Demo concept — 2026.
