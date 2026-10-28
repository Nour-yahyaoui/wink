# Technical Architecture & Engineering Plan — Nour (`@Nour-yahyaoui`)

> **Status:** Planning & Repository Structuring Only *(Awaiting product spec alignment in [`iyed.md`](./iyed.md) before implementation)*  
> **Project Concept & Product Vision:** Iyed Omri (`@iyedomri`)  
> **Technical Architecture & Infrastructure Lead:** Nour Yahyaoui (`@Nour-yahyaoui`)

---

## 1. Collaboration & Division of Responsibilities

W.I.N.K is built around a clear two-pillar partnership:

- **Product Vision (`plan/iyed.md` — Iyed):** Defines *what* W.I.N.K does, how students discover and meet each other, what each screen feels like, and which features ship first.
- **Technical Strategy (`plan/nour.md` — Nour):** Defines *how* W.I.N.K is engineered, secured, stored, and deployed across environments.

**Execution Rule:** No production feature code is written prematurely. Once Iyed documents the product flows in [`iyed.md`](./iyed.md), the `frontend/` implementation will directly follow his product specification on top of the technical stack defined below.

---

## 2. Phased Architecture Roadmap

Rather than over-engineering microservices on day one—or locking ourselves into a monolith forever—we will evolve the system in two deliberate phases:

### Phase 1 — Full-Stack Next.js App (Fast Iteration)
- Start with a **unified Next.js full-stack application** (App Router, Server Components, Route Handlers / Server Actions).
- Frontend UI and initial API routes live cohesively so we can rapidly ship Iyed's product flows (`iyed.md`), validate Google OAuth login, connect NeonDB, and wire up Vercel Blob image uploads.
- Deploy seamlessly to **Vercel** with preview deployments on every Pull Request.

### Phase 2 — Service Separation (Scale & Real-Time Split)
- Once core user flows stabilize and real-time / background workloads grow (e.g., WebSockets for live meetup chat, notifications, background moderation/cron jobs), split the runtime cleanly:
  - **`frontend/`** stays on **Vercel** (optimized edge delivery, SSR/ISR, UI layer).
  - **`backend/`** extracts into a dedicated API & real-time service deployed on **Render** (persistent connections, horizontal service control, independent scaling).
  - Both layers continue sharing the strongly typed **NeonDB** PostgreSQL schema and **Vercel Blob** media store.

```text
Phase 1 (Unified Full-Stack):
  [ Browser ] ──► [ Next.js Full-Stack App (Vercel) ] ──┬──► [ NeonDB (PostgreSQL) ]
                                                        ├──► [ Vercel Blob (Images) ]
                                                        └──► [ Google OAuth 2.0 ]

Phase 2 (Decoupled Frontend & Backend):
  [ Browser ] ──► [ Frontend: Next.js (Vercel) ] ───────► [ Backend API (Render) ]
                         │                                         │
                         ▼                                         ▼
                  [ Google OAuth ]                     [ NeonDB ] + [ Vercel Blob ]
```

---

## 3. Core Technology Stack

| Layer | Choice | Why We Use It |
|---|---|---|
| **App Framework (Phase 1 & Frontend)** | **Next.js** | Fast full-stack velocity first, clean separation into standalone frontend later, first-class Vercel integration. |
| **Authentication** | **Google OAuth** | Frictionless, trusted student sign-in right out of the box—no custom password storage risk. |
| **Database** | **NeonDB (Serverless PostgreSQL)** | Production-grade relational Postgres with autoscaling, connection pooling, and instant database branching for dev/demo testing. |
| **Image & Media Storage** | **Vercel Blob** | Secure, edge-cached storage for user profile photos, avatars, and meetup imagery (replacing prototype emoji placeholders). |
| **Frontend Deployment** | **Vercel** | Zero-config Next.js hosting, automatic PR preview URLs, edge network performance. |
| **Backend Deployment (Phase 2)** | **Render** | Ideal target when separating `backend/` for long-running processes, WebSockets, and dedicated API services. |

---

## 4. Repository Workspace Structure

To keep production engineering clean while preserving safe sandboxes for experimentation and demos, the repository is organized into **6 core workspaces** plus dedicated **planning**, **security**, and **AI knowledge** directories:

### Core Application & Data Workspaces (Production vs. Demo)
1. **`frontend/`** — Production Next.js user interface. Built directly from the product specs in [`plan/iyed.md`](./iyed.md), integrating Google OAuth and Vercel Blob uploads, deployed on Vercel.
2. **`frontend-demo/`** — Sandboxed frontend demo & UI prototyping workspace for testing new layouts, animations, and mock flows before promoting to `frontend/`.
3. **`backend/`** — Production backend service layer (API contracts, business logic, real-time handlers; extracted for standalone deployment on Render in Phase 2).
4. **`backend-demo/`** — Demo/sandbox backend workspace for isolated endpoint prototyping and offline/mock API testing.
5. **`database/`** — Production **NeonDB** (PostgreSQL) schemas, migrations, indexes, constraints, and data-access layer.
6. **`database-demo/`** — Seed data, campus/Monastir fixture generators, and NeonDB preview/demo datasets for safe testing without touching production records.

> *Note:* The original zero-dependency prototype remains preserved in [`/wink`](../wink) as our initial concept reference.

### Dedicated Engineering Directories
- **`plan/`** — Role-based planning (`nour.md` for technical architecture, `iyed.md` for product specification).
- **`security/`** — Centralized vulnerability registry and remediation log. Every single security issue discovered—across auth, API validation, Blob uploads, SQL queries, headers, or dependencies—is documented here with root cause and verified fix.
- **`used_skills/`** — Engineering & AI knowledge base recording the skills, architectural patterns, debugging lessons, and project notes learned by AI assistants and contributors throughout W.I.N.K's development.

---

## 5. Authentication & Media Flow Design (High-Level)

### Google OAuth Flow
1. User clicks **Continue with Google** on the Next.js frontend.
2. OAuth 2.0 / OIDC handshake verifies identity with Google and returns verified email, display name, and avatar URL.
3. Server upserts the user record in **NeonDB** (`users` + `oauth_accounts`) and issues an `HttpOnly`, `Secure`, `SameSite=Lax` session/token.
4. First-time users are routed to onboarding (defined by `plan/iyed.md`); returning users go straight into the app.

### Vercel Blob Image Upload Flow
1. Authenticated user selects profile or meetup photos in `frontend/`.
2. Server validates authentication, file MIME type (`image/jpeg`, `image/png`, `image/webp`), and strict byte-size limits before authorizing upload to **Vercel Blob**.
3. Returned immutable Blob URL is persisted in **NeonDB** and served via CDN.

---

## 6. Security-First Commitment (`/security`)

Security is tracked continuously from day one inside [`/security`](../security):
- Every vulnerability found (during code review, testing, or dependency audits) gets an entry in [`security/VULNERABILITIES_LOG.md`](../security/VULNERABILITIES_LOG.md) detailing **severity, affected component, attack vector, fix, and verification**.
- Core guardrails enforced from commit #1 of implementation:
  - Strict environment secret isolation (`.env*` never committed; managed in Vercel/Render/Neon dashboards).
  - Parameterized queries / ORM prepared statements on **NeonDB** (zero raw SQL string concatenation).
  - Authenticated & MIME/size-validated uploads to **Vercel Blob**.
  - Strict `HttpOnly` session cookies, CSRF protection, rate limiting, and `Content-Security-Policy` headers.

---

## 7. Next Steps (Waiting Gate)

- [x] Establish repository folder structure (`frontend`, `frontend-demo`, `backend`, `backend-demo`, `database`, `database-demo`, `security`, `used_skills`, `plan`).
- [x] Add GitHub governance files (`LICENSE`, `CONTRIBUTING.md`, `CONTRIBUTORS.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/` templates).
- [ ] **Wait for Iyed** to document product flows, screens, and feature scope in [`plan/iyed.md`](./iyed.md).
- [ ] Review `iyed.md` together, finalize NeonDB schema in `database/`, and initialize the Phase 1 Next.js full-stack app with Google OAuth, NeonDB, and Vercel Blob.
