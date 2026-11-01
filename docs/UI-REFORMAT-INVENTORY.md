# UI Reformat & Demo Alignment Inventory — W.I.N.K

> Generated per `global-ui-reformat` Step 1 before modifying or building demo UI files.

## 1. Existing Prototype Audit (`wink/` & Root Harnesses)

| # | Route / File | Existing State | Loading? | Empty? | Error? | Dark Mode? | Findings vs. `plan/iyed.md` & UX Skills |
|---|---|---|---|---|---|---|---|
| 1 | `wink/public/index.html` | 6-slide presentation deck | None | N/A | N/A | Dark-only mesh blobs | Uses AI tells: gradient text, radial mesh blobs, emoji bubbles (`⚽`, `🎮`), glassmorphism (`distinctive-visual-style` tells #1, #2, #3, #19). |
| 2 | `wink/public/app.html` + `js/app.js` | Legacy social meetup demo | Raw flash / no layout skeletons | Emoji empty state (`💤`) | Raw `banner` / `err.message` toast | Light-only hardcoded hexes | Includes chat, comments, Monastir-wide feed, Instagram photo grids & 5-star ratings — explicitly excluded by `plan/iyed.md`. |
| 3 | `wink/server.js:591` | `GET /api/meetups?sort=match` | N/A | N/A | Generic 500 | N/A | **Bug:** Sorts `match` ascending `(a.match - b.match)` instead of descending `(b.match - a.match)`. |
| 4 | `test_offline.js:33` & `test_legacy_user.js:47` | Root Node regression scripts | N/A | N/A | Crashes (`MODULE_NOT_FOUND`) | N/A | **Bug:** Hardcodes `/home/user/wink/public/js/app.js` instead of `path.join(__dirname, 'wink/public/js/app.js')`. |

---

## 2. New FSM-Aligned Demo App Inventory (`frontend-demo/` + `database-demo/`)

Built from `plan/iyed.md` (FSM-only, purpose-before-profile, compatible intent matching, mutual opt-in, structured time/venue proposals, no chat/social feed) with `localStorage` persistence and Vercel deployment:

| # | View / Surface | Source File | Data Source (`localStorage`) | Loading State | Empty State | Error State | Dark Mode |
|---|---|---|---|---|---|---|---|
| 1 | **Compatible Requests Board** (`/`) | `frontend-demo/src/App.tsx` | `database-demo/localStorageDb.ts` (`requests`, `choices`) | 120ms-delayed layout-matched `RequestListSkeleton` | Contextual `EmptyState` (distinguishes empty board vs. strict intent filter mismatch) | `ErrorState` via `toAppError()` + correlation `errorId` + Retry | System-first + blocking `<head>` script + toggle |
| 2 | **Mutual Match & Logistics Slip** | `frontend-demo/src/components/MutualMatchSlip.tsx` | `choices`, `proposals` | `SlipSkeleton` | Guided explanation of mutual-choice states | Inline human error + retry preserving selected slot/venue | Token-driven (`var(--*)`) |
| 3 | **Post Activity Request Modal** | `frontend-demo/src/components/CreateRequestModal.tsx` | `createActivityRequest()` | Immediate button lock (`Posting…`) + timeout | N/A | Field-level blur/submit validation (`aria-invalid`) + draft preserved on failure | Token-driven (`var(--*)`) |
| 4 | **LocalStorage DB Inspector & Code Example** | `frontend-demo/src/components/LocalStorageInspector.tsx` | Live `wink_fsm_demo_db_v1` JSON + byte metrics | `TableSkeleton` | Seed reset CTA | Built-in fault simulator to verify `ErrorState` & retry | Token-driven (`var(--*)`) |
| 5 | **First-Run Onboarding** | `frontend-demo/src/components/OnboardingTour.tsx` | `wink:onboard:v1:done` | Settled 500ms launch | Skippable anytime | Graceful skip if target hidden | Focus-trapped, `Esc`-closable, `prefers-reduced-motion` safe |
| 6 | **404 Not Found View** | `frontend-demo/src/App.tsx` | Client route check | Instant | Action back to FSM board | N/A | Matches exact design discipline |
