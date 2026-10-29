# Technical Architecture & Engineering Plan — Nour (`@Nour-yahyaoui`)

> **Status:** Planning & Repository Structuring Only *(No application code implemented yet — awaiting joint review & open-decision sign-off on [`iyed.md`](./iyed.md))*  
> **Project Concept & Product Vision:** Iyed Omri (`@iyedomri`) — see [`iyed.md`](./iyed.md)  
> **Technical Architecture & Infrastructure Lead:** Nour Yahyaoui (`@Nour-yahyaoui`)

---

## 1. Collaboration & Division of Responsibilities

W.I.N.K is built around a clear two-pillar partnership:

- **Product Vision (`plan/iyed.md` — Iyed):** Defines *what* W.I.N.K does — an **FSM-only**, purpose-first, mutual-choice meetup tool focused on making real face-to-face activities happen (without chat loops, social feeds, or popularity rankings).
- **Technical Strategy (`plan/nour.md` — Nour):** Defines *how* W.I.N.K is engineered, authenticated, stored, secured, and deployed across environments.

**Execution Rule:** No production feature code is written until the open product decisions in [`iyed.md`](./iyed.md) are resolved and approved. Once approved, `frontend/` will implement the exact flows specified in `iyed.md` on top of the stack below.

---

## 2. Phased Architecture Roadmap

We evolve the system in two deliberate phases:

### Phase 1 — Full-Stack Next.js App (Fast Iteration)
- Start with a **unified Next.js full-stack application** (App Router, Server Components, Route Handlers / Server Actions).
- Frontend UI and initial API routes live cohesively so we can rapidly build Iyed's approved MVP flows (`iyed.md`), integrate **Google OAuth**, connect **NeonDB**, and support **Vercel Blob** media storage.
- Deploy seamlessly to **Vercel** with preview deployments on every Pull Request.

### Phase 2 — Service Separation (Dedicated Frontend & Backend Split)
- Once core MVP flows stabilize and dedicated backend workloads grow (e.g., background request expiration jobs, real-time status notifications, matching engine isolation, moderation pipelines), split the runtime cleanly:
  - **`frontend/`** stays on **Vercel** (optimized edge delivery, SSR, UI layer).
  - **`backend/`** extracts into a dedicated API service deployed on **Render** (background workers, persistent connections, independent scaling).
  - Both layers share the strongly typed **NeonDB** PostgreSQL schema and **Vercel Blob** store.

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
| **Authentication** | **Google OAuth** | Frictionless, trusted sign-in (and easy domain/email inspection if institutional FSM email verification is chosen) with zero password-hash liability. |
| **Database** | **NeonDB (Serverless PostgreSQL)** | Relational Postgres ideal for strict intent-matching queries, state transitions, mutual-choice constraints, and instant branching for dev/demo testing. |
| **Image & Media Storage** | **Vercel Blob** | Secure, edge-cached object storage for user avatars / optional profile or activity images. |
| **Frontend Deployment** | **Vercel** | Zero-config Next.js hosting, automatic PR preview URLs, edge network performance. |
| **Backend Deployment (Phase 2)** | **Render** | Target platform when separating `backend/` for background expiration jobs, dedicated API routing, and service isolation. |

---

## 4. Technical Alignment with `plan/iyed.md`

Mapping Iyed's product principles directly onto our technical design (for when implementation is authorized):

1. **FSM-Only Scope & Eligibility:** Enforced at the auth/onboarding middleware layer alongside **Google OAuth** claims and FSM eligibility verification.
2. **Purpose-Before-Profile & Compatible Intent Matching:** Modeled in **NeonDB** with structured columns/enums (`activity`, `purpose`, `role_needed`, `availability_window`, `fsm_venue`) rather than loose free-text or hobby-only matching—preventing incompatible intents from ever matching.
3. **Mutual Opt-In & Explicit Plan State Machine:** Enforced transactionally in **NeonDB** across strict states: `open` → `pending_mutual` → `arranging_details` → `confirmed` → `completed` / `cancelled` / `expired`.
4. **Structured Logistics (No Chat / No Social Feed in MVP):** Instead of WebSocket chat rooms or public star ratings, the backend exposes structured time & public-FSM-venue proposal endpoints requiring two-sided confirmation, plus `reports` and `blocks` tables for user safety.

---

## 5. Repository Workspace Structure

### Core Application & Data Workspaces (Production vs. Demo)
1. **`frontend/`** — Production Next.js user interface. Built directly from [`plan/iyed.md`](./iyed.md), integrating Google OAuth and Vercel Blob, deployed on Vercel.
2. **`frontend-demo/`** — Sandboxed frontend demo & UI prototyping workspace for testing FSM activity-request flows with mock students before promoting to `frontend/`.
3. **`backend/`** — Production backend service layer (API contracts, compatibility matching rules, state transitions; extracted to **Render** in Phase 2).
4. **`backend-demo/`** — Demo/sandbox backend workspace for isolated endpoint prototyping.
5. **`database/`** — Production **NeonDB** (PostgreSQL) schemas, migrations, indexes, and transactional constraints.
6. **`database-demo/`** — Seed data, contrasting FSM intent fixtures (e.g., *"need one football player"* vs. *"looking for coffee"*), and NeonDB preview-branch datasets.

> *Note:* The earlier concept prototype remains preserved in [`/wink`](../wink) as historical reference only.

### Dedicated Engineering Directories
- **`plan/`** — Role-based planning (`iyed.md` for product specification, `nour.md` for technical architecture).
- **`security/`** — Centralized vulnerability registry ([`VULNERABILITIES_LOG.md`](../security/VULNERABILITIES_LOG.md)) recording every single security issue found and fixed.
- **`used_skills/`** — Engineering & AI knowledge base recording learned skills, reusable patterns, and project notes.

---

## 6. Security-First Commitment (`/security`)

- Every vulnerability discovered is logged in [`security/VULNERABILITIES_LOG.md`](../security/VULNERABILITIES_LOG.md) with severity, affected component, root cause, fix, and verification.
- Core guardrails enforced from commit #1 of implementation:
  - Strict environment secret isolation (`.env*` never committed).
  - Parameterized queries / prepared statements on **NeonDB** and server-enforced authorization (preventing IDOR or exposing declined choices).
  - Authenticated, MIME-validated, size-capped uploads to **Vercel Blob**.
  - `HttpOnly`, `Secure`, `SameSite=Lax` sessions, CSRF protection, rate limiting, and strict `Content-Security-Policy` headers.

---

## 7. Next Steps (Waiting Gate)

- [x] Establish repository folder structure (`frontend`, `frontend-demo`, `backend`, `backend-demo`, `database`, `database-demo`, `security`, `used_skills`, `plan`).
- [x] Add GitHub governance files (`LICENSE`, `CONTRIBUTING.md`, `CONTRIBUTORS.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/` templates).
- [x] Consolidate Iyed's product specification inside [`plan/iyed.md`](./iyed.md) and align technical architecture.
- [ ] **Resolve open product decisions** listed at the bottom of [`plan/iyed.md`](./iyed.md) (FSM verification method, 1-to-1 vs. small group, venue boundaries, proposal rounds) before authorizing MVP implementation.
