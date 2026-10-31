# W.I.N.K 🤝

> **Purpose-first, mutual-choice in-person activity matching for students at FSM (Faculté des Sciences de Monastir).**

- **Live FSM LocalStorage Demo (Vercel):** **[https://wink-mu.vercel.app](https://wink-mu.vercel.app)**
- **Design & Ancestor Style Brief:** [`docs/STYLE.md`](./docs/STYLE.md) · [`docs/UI-REFORMAT-REPORT.md`](./docs/UI-REFORMAT-REPORT.md)

---

## 👥 Team & Planning (`/plan`)

W.I.N.K is built with a clear separation between **product vision** and **technical architecture**—documented inside [`/plan`](./plan) before any production code (`frontend/`, `backend/`, `database/`) is implemented:

| Role | Lead | Blueprint |
|---|---|---|
| **Product Creator & Vision** | **Iyed Omri** ([@iyedomri](https://github.com/iyedomri)) | [`plan/iyed.md`](./plan/iyed.md) |
| **Technical Lead & Security Architect** | **Nour Yahyaoui** ([@Nour-yahyaoui](https://github.com/Nour-yahyaoui)) | [`plan/nour.md`](./plan/nour.md) |

---

## 🧪 Interactive FSM Demo (`frontend-demo/` + `database-demo/`)

While production workspaces remain gated on open product decisions in [`plan/iyed.md`](./plan/iyed.md), the repository includes a live **Vite + React 19 + TypeScript** demo backed by a self-healing `localStorage` repository (`wink_fsm_demo_db_v1`):

- **5-Axis FSM Intent Compatibility Engine (`database-demo/localStorageDb.ts`):** Pairs requests strictly when FSM campus boundary, activity, exact purpose, complementary role, and time slots align — with an inspectable transparency table showing why mismatched requests were excluded.
- **Two-Half Perforated Mutual Match Slips (`frontend-demo/src/components/MutualMatchSlip.tsx`):** Unlocks structured public FSM venue (`Stade universitaire`, `Cafétéria centrale`, `Bibliothèque universitaire`, `Jardin des sciences`, `Esplanade Amphi A`, `Hall Département Informatique`) and time confirmation only after mutual opt-in — zero unsolicited open chat.
- **Live LocalStorage DB & Code Tab:** Inspect raw JSON state, copy the reference TypeScript repository pattern, reset FSM mock data, or arm fault simulation to test human-first error recovery.
- **Tunisian Limestone & Kiln Terracotta Visual System (`docs/STYLE.md`):** Zero-FOUC light & dark modes (18/18 token pairs pass WCAG AA `>= 4.5:1`), 4-step spotlight onboarding tour, 120ms-delayed skeletons, and print/reduced-motion support.

```bash
npm install
npm run dev      # Local Vite dev server
npm run build    # TypeScript check + production bundle -> dist/
npm test         # Runs database-demo (8/8) + offline (28/28) + legacy user migration tests
```

---

## 🛠️ Planned Production Stack

- **Phase 1 (Unified Full-Stack):** **Next.js** full-stack application deployed on **Vercel**, implementing the approved FSM product flows in [`plan/iyed.md`](./plan/iyed.md).
- **Phase 2 (Service Split):** Dedicated **Next.js** `frontend/` on **Vercel** + standalone `backend/` API service on **Render**.
- **Authentication:** **Google OAuth**
- **Database:** **NeonDB** (Serverless PostgreSQL)
- **Media & Image Storage:** **Vercel Blob**

---

## 📁 Repository Structure

```text
.
├── plan/                 # Role-based blueprints before production coding
│   ├── iyed.md           # FSM product vision, matching rules & MVP scope (@iyedomri)
│   └── nour.md           # Technical stack, architecture & infra plan (@Nour-yahyaoui)
│
├── frontend/             # Production Next.js frontend (gated on plan sign-off)
├── frontend-demo/        # Vite + React 19 + TS FSM Campus Board demo (deployed on Vercel)
├── backend/              # Production backend service (Phase 2 Render split)
├── backend-demo/         # Demo & prototype backend sandbox
├── database/             # Production NeonDB (PostgreSQL) schemas & migrations
├── database-demo/        # Typed localStorage DB adapter, 5-axis engine & FSM mock data
├── docs/                 # UX style brief (STYLE.md), UI inventory & verification report
│
├── security/             # Ledger of every security vulnerability found & fixed
├── used_skills/          # AI-learned skills, engineering patterns & project notes
├── wink/                 # Earlier zero-dependency Node.js concept prototype (repaired)
│
├── CONTRIBUTORS.md       # Project creators & roles
├── CONTRIBUTING.md       # Workflow, branch & PR conventions
├── SECURITY.md           # Security policy & responsible disclosure
├── CODE_OF_CONDUCT.md    # Community standards
└── LICENSE               # MIT License
```

---

## ⚡ Running the Earlier Concept Prototype (`/wink`)

The earlier zero-dependency Node.js prototype also remains runnable and tested (`npm test`):

```bash
cd wink
node server.js
```

---

## 📄 Governance & License

- **Contributors:** [`CONTRIBUTORS.md`](./CONTRIBUTORS.md)
- **Contributing Guide:** [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- **Security Policy & Vulnerability Log:** [`SECURITY.md`](./SECURITY.md) · [`security/VULNERABILITIES_LOG.md`](./security/VULNERABILITIES_LOG.md)
- **License:** [MIT](./LICENSE)
