# W.I.N.K 🤝

> **No friends? No problem.**  
> A people-first campus meetup app connecting students at **FSM (Faculté des Sciences de Monastir)** and **Monastir** through shared hobbies.

## ✨ Features

- **Instagram-style Profiles** — Share your hobbies, bio, photo grid, and `@instagram` handle.
- **Discover ("Yes" Flow)** — Browse students online, match by shared interests, and get smart local venue suggestions across FSM & Monastir.
- **Meetups & Chats** — Host or join small-group study sessions, sports games, and hangouts with built-in group chat, location cards, comments, and post-meet ⭐ ratings.
- **Zero-Dependency Backend** — Pure Node.js (`>= 18`) HTTP server + REST API with atomic JSON persistence, session auth, rate limiting, and strict security headers.
- **Offline Demo Mode** — Automatically falls back to browser storage when opened without a running server.

## 🚀 Quick Start

Requires **Node.js 18+** (no `npm install` needed — zero external dependencies).

```bash
cd wink
node server.js
```

- **Presentation Deck:** `http://localhost:8000`
- **Demo App:** `http://localhost:8000/app`

### Run with Docker

```bash
cd wink
docker build -t wink .
docker run -p 8000:8000 -v $(pwd)/data:/app/data wink
```

## 📁 Project Structure

```text
.
├── wink/
│   ├── server.js        # Zero-dependency Node HTTP server & REST API
│   ├── public/          # Static frontend (landing deck + demo app)
│   ├── Dockerfile       # Alpine container build with /api/health check
│   └── README.md        # Detailed API reference & engineering notes
├── test_offline.js      # Offline mode end-to-end test harness
└── test_legacy_user.js  # Legacy user session/migration regression test
```

For the full REST API reference, security details, and architecture notes, see [`wink/README.md`](wink/README.md).

## 📄 License

MIT
