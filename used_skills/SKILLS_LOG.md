# AI Learned Skills Log — W.I.N.K

A living repository of technical skills, workflow conventions, and project-specific patterns learned while building **W.I.N.K**.

---

## Recorded Skills

## SKILL-001: Role-Split Planning & Production/Demo Monorepo Structuring
- **Date:** 2026-10-28
- **Category:** Collaboration & Architecture
- **Context:** Setting up **W.I.N.K** for two collaborators with distinct responsibilities—**Iyed** owning the product concept (`plan/iyed.md`) and **Nour** owning the technical stack and security (`plan/nour.md`)—before writing production code.
- **Key Takeaway / Pattern:**
  1. Separate **product specification (`plan/iyed.md`)** from **technical architecture (`plan/nour.md`)** so product creativity and engineering decisions stay decoupled yet aligned.
  2. Pair every production layer (`frontend/`, `backend/`, `database/`) with a dedicated `-demo` counterpart (`frontend-demo/`, `backend-demo/`, `database-demo/`) so UI prototypes and seeded fixtures never pollute production schemas or deployments.
  3. Start with a **unified Next.js full-stack app** on Vercel (Google OAuth + NeonDB + Vercel Blob) for maximum early velocity, while designing boundaries cleanly so `backend/` can split onto **Render** in Phase 2 without rewriting the database layer.
  4. Maintain a first-class `/security` vulnerability ledger from day zero rather than bolting security audits on at the end.
- **Pitfalls to Avoid:**
  - Never implement production screens before `plan/iyed.md` open decisions are signed off.
  - Never mix demo/mock storage adapters into production `database/` or `backend/` modules.

---

## SKILL-002: Ancestor-Grounded Distinctive UI & Zero-FOUC Dual-Theme Architecture
- **Date:** 2026-10-29
- **Category:** Design System & UX (`distinctive-visual-style`, `design-system-and-visual-language`, `global-ui-reformat`, `frontend-craft`)
- **Context:** Designing and building the `frontend-demo/` FSM campus board without generic SaaS templates or AI visual clichés.
- **Key Takeaway / Pattern:**
  1. **Commit `docs/STYLE.md` before writing CSS:** Anchor every hex token in a real physical object (here: FSM cork-and-linen noticeboard, Monastir limestone daylight, fountain ink, and kiln-fired terracotta), shift all colors away from stock recipe defaults, and explicitly record two rejected visual directions (`REJECTED:`).
  2. **90% Neutral / ~5% Single Accent + Hairline Hierarchy:** Use editorial serif (`Fraunces` weight `400–500`) + working sans + tabular monospace (`tabular-nums`), 1px structural rules instead of drop shadows on flat cards, and one product-specific signature component (`MutualMatchSlip` perforated two-stub confirmation card).
  3. **Zero-FOUC Theme + Verified Contrast:** Place a blocking `<script>` in `<head>` reading `localStorage['wink:theme']` / `prefers-color-scheme` before first paint, and verify every foreground/background token pair mathematically meets WCAG AA `>= 4.5:1` in both themes.
  4. **Resilience & Onboarding by Default:** Pair 120ms-delayed skeletons with `toAppError()` human error states (preserving form inputs on failure), an `onboard:v1:done` 4-step spotlight tour with masthead replay, `@media (prefers-reduced-motion: reduce)`, and `@media print`.
- **Pitfalls to Avoid:**
  - Never ship gradient text, hero radial glows, glassmorphism, emoji UI icons, or letter-in-square favicons.
  - Never display raw `error.message` or stack traces to end users.

---

## SKILL-003: Self-Healing LocalStorage Repository & Vercel Git Deployment Verification
- **Date:** 2026-10-29
- **Category:** Database (`database-demo`) & Deployment (Vercel)
- **Context:** Building a realistic browser-persisted demo database for Vercel deployment while keeping CommonJS root regression suites passing.
- **Key Takeaway / Pattern:**
  1. **Async Repository Contract Over `localStorage`:** Wrap `window.localStorage` behind `AbortSignal`-aware async functions (`loadDemoDatabase`, `optInCompatibleRequest`, `proposeMatchLogistics`, `confirmMatchLogistics`) with automatic JSON schema validation + self-healing seed recovery and a toggleable fault flag (`wink_fsm_simulate_fault`) for live UI resilience testing.
  2. **ESM Vite + CommonJS Test Coexistence:** When legacy root tests use CommonJS `require()`, omit `"type": "module"` from root `package.json` and name the Vite config `vite.config.mts` so both Vite 6 ESM builds and legacy Node tests run seamlessly.
  3. **Deterministic Vercel Production Deployments:** Build locally (`npm run build` including `cp dist/index.html dist/404.html` instead of fragile custom `vercel.json` schemas), push the branch to GitHub, fetch the numeric GitHub `repoId` via `gh api repos/<owner>/<repo> --jq '.id'`, trigger `vercel__create_deployment` with `target: "production"`, and poll `vercel__get_deployment` until `READY`.
- **Pitfalls to Avoid:**
  - Never pass `target: "preview"` to Vercel's `create_deployment` API (invalid enum value; use `"production"` or omit).
  - Never claim a Vercel URL works before `readyState` reaches `READY` and build events are verified clean.
