# `frontend-demo/` — W.I.N.K FSM Campus Activity Board (LocalStorage Demo)

Interactive Vite + React 19 + TypeScript demo application implementing `@iyedomri`'s FSM product specification ([`../plan/iyed.md`](../plan/iyed.md)) over the typed `localStorage` repository in [`../database-demo/`](../database-demo/).

> **Production boundary preserved:** Production folders (`frontend/`, `backend/`, `database/`) remain untouched and gated on open product decisions in `plan/iyed.md`.

---

## Key Capabilities

1. **FSM Student Persona Switcher (Left Rail):** Switch live between 6 verified FSM student personas (`Amine`, `Hamza`, `Meriem`, `Karim`, `Yasmine`, `Salma`) to test both sides of mutual opt-in and venue confirmation.
2. **5-Axis Intent Compatibility Board:** Automatically filters out campus slips with misaligned activity, purpose, role, or time window — with an inspectable transparency table explaining why excluded requests were hidden.
3. **Two-Half Perforated Mutual Match Slips (`MutualMatchSlip.tsx`):**
   - Upper half: intent summary, compatibility proof, and two-sided opt-in stamps.
   - Lower stub: structured public FSM venue & time confirmation (`Stade universitaire`, `Cafétéria centrale`, `Bibliothèque universitaire`, `Jardin des sciences`, `Esplanade Amphi A`, `Hall Département Informatique`) + campus check-in — replacing unsolicited open chat.
4. **Live LocalStorage DB & Code Tab (`LocalStorageInspector.tsx`):**
   - Telemetry table for `window.localStorage["wink_fsm_demo_db_v1"]`
   - Copyable TypeScript repository & 5-axis filter reference code
   - Live raw JSON collection inspector, 1-click mock seed reset, and storage fault simulator to test `ErrorState` + Retry recovery.
5. **UX & Accessibility Craft ([`../docs/STYLE.md`](../docs/STYLE.md)):**
   - Monastir Limestone & Kiln Terracotta light mode + Warm Basalt dark mode (18/18 token pairs pass WCAG AA `>= 4.5:1`, zero-FOUC inline head script).
   - 4-step spotlight onboarding tour (`onboard:v1:done`) with masthead replay.

---

## Local Commands (Run from Repository Root)

```bash
npm install
npm run dev      # Starts Vite dev server on 0.0.0.0
npm run build    # Runs tsc -b && vite build && cp dist/index.html dist/404.html
npm test         # Runs database-demo suite (8/8) + legacy offline & migration suites
```
