# Vulnerability & Remediation Log

Every security vulnerability and correctness/integrity defect found and fixed in **W.I.N.K** is recorded here to maintain a transparent, auditable security history and prevent regressions.

---

## Summary Ledger

| ID | Date | Component | Severity | Vulnerability / Defect Summary | Status | Fix / Reference |
|---|---|---|---|---|---|---|
| `SEC-BASE-001` | 2026-10-28 | `wink/server.js` | Baseline | Prototype hardening audit (path traversal, XSS, payload DoS, brute-force, session TTL) | Mitigated in Prototype | [`wink/server.js`](../wink/server.js) |
| `SEC-2026-001` | 2026-10-29 | `wink/server.js` | Medium | Inverted compatibility sort (`sort === 'match'`) ranked lowest-compatibility (`0%`) meetups above highest matches | Fixed & Verified | [`wink/server.js:591`](../wink/server.js) |
| `SEC-2026-002` | 2026-10-29 | `test_offline.js`, `test_legacy_user.js` | Low | Broken module path resolution (`./public/js/app.js` instead of `./wink/public/js/app.js`) disabled offline security & migration regression checks | Fixed & Verified | [`test_offline.js`](../test_offline.js), [`test_legacy_user.js`](../test_legacy_user.js) |
| `SEC-2026-003` | 2026-10-29 | `database-demo/`, `frontend-demo/` | Medium | Client storage tampering / corrupted `localStorage` JSON crash & raw exception/stack-trace leakage in UI | Fixed & Verified | [`database-demo/localStorageDb.ts`](../database-demo/localStorageDb.ts), [`frontend-demo/src/lib/errors.ts`](../frontend-demo/src/lib/errors.ts) |

---

## Recorded Entries

### SEC-BASE-001 — Prototype Baseline Security Controls Carry-Over
- **Date Logged:** 2026-10-28
- **Logged By:** `@Nour-yahyaoui`
- **Affected Component:** `wink/` (Initial Prototype Reference)
- **Severity:** Baseline Reference
- **Status:** Mitigated in Prototype — Must Carry Forward to Next.js / Render Stack
- **Key Mitigations Established in Prototype (to preserve in production):**
  1. **Path Traversal Defense:** Static file handler normalizes paths and rejects raw or percent-encoded `..`, `\`, and null bytes (`\0`).
  2. **XSS Prevention & Strict CSP:** Zero raw `innerHTML` user-content interpolation, zero inline script handlers, and `Content-Security-Policy: default-src 'self'; script-src 'self'`.
  3. **Payload Size & `100-Continue` DoS Protection:** Hard 1 MB body cap returning `413 Payload Too Large`, including `checkContinue` header inspection before streaming bodies.
  4. **Rate Limiting:** Sliding-window per-IP rate limiting (`30 req/min` on auth endpoints, `60 req/min` on write endpoints).
  5. **Session Hygiene:** Cryptographically random 24-byte hex bearer tokens, 30-day TTL expiration purge, and single-active-session rotation on login.
  6. **Error Opacity:** Generic `500 Internal server error` responses so stack traces never leak to clients.

---

### SEC-2026-001 — Inverted Compatibility Sort Exposing Zero-Match Meetups First
- **Date Found:** 2026-10-29
- **Date Fixed:** 2026-10-29
- **Discovered By:** `@Nour-yahyaoui`
- **Affected Component:** `wink/server.js` (`/api/meetups?sort=match`)
- **Severity:** Medium (Trust & Safety / Intent-Matching Integrity)
- **Status:** Fixed & Verified
- **Vulnerability Description & Impact:**
  When querying `/api/meetups?sort=match` on the Node server, `wink/server.js` sorted ascending (`(a.match || 0) - (b.match || 0)`) while the offline fallback sorted descending. As a result, completely incompatible (`0%` match) requests were surfaced first, undermining W.I.N.K's core anti-mismatch safety promise.
- **Root Cause:**
  Reversed comparator operands on line 591 of `wink/server.js`.
- **Fix Applied:**
  Updated `wink/server.js` comparator to `(b.match || 0) - (a.match || 0)` to match descending compatibility order.
- **Verification / Regression Check:**
  Verified parity between server and offline comparators and re-ran `npm test`.

---

### SEC-2026-002 — Regression Suite Path Drift After Repository Restructure
- **Date Found:** 2026-10-29
- **Date Fixed:** 2026-10-29
- **Discovered By:** `@Nour-yahyaoui`
- **Affected Component:** `test_offline.js`, `test_legacy_user.js`
- **Severity:** Low (CI / Verification Coverage)
- **Status:** Fixed & Verified
- **Vulnerability Description & Impact:**
  Both root regression scripts referenced `./public/js/app.js` instead of `./wink/public/js/app.js`, causing `MODULE_NOT_FOUND` on execution and masking regressions in offline auth/session/mutual-consent flows.
- **Root Cause:**
  Prototype files were housed under `wink/` without updating the relative path in the root test harnesses.
- **Fix Applied:**
  Updated both harnesses to resolve `path.join(__dirname, 'wink/public/js/app.js')` and wired `npm test` to run both suites plus `test_demo_db.mjs`.
- **Verification / Regression Check:**
  `npm test` executes all 8 `database-demo` suites, all 28 `test_offline.js` checks, and `test_legacy_user.js` with exit code `0`.

---

### SEC-2026-003 — Client Storage Tampering Defense & Human-Safe Error Opacity in Demo App
- **Date Found:** 2026-10-29
- **Date Fixed:** 2026-10-29
- **Discovered By:** `@Nour-yahyaoui`
- **Affected Component:** `database-demo/localStorageDb.ts`, `frontend-demo/src/lib/errors.ts`
- **Severity:** Medium (Client Resilience, Input Sanitization & Information Disclosure)
- **Status:** Fixed & Verified
- **Vulnerability Description & Impact:**
  Browser `localStorage` is user-mutable; malformed JSON, tampered schema fields, or storage quota exceptions can crash client apps in a white-screen loop or leak raw internal exception messages/stack traces in the DOM. Additionally, unvalidated client calls could attempt to pair incompatible intents or bypass block lists.
- **Fix Applied:**
  1. Implemented `isValidDb()` structural schema validation and automatic self-healing re-seeding in `readDemoDbSync()`.
  2. Enforced server-mirroring domain guards inside `optInCompatibleRequest()` (rejecting any pair failing `evaluateCompatibility()`) and `reportAndOptionallyBlock()` (automatically cancelling uncompleted matches with blocked peers).
  3. Bounded string lengths on request titles, role details, context notes, and safety notes.
  4. Added `toAppError()` + `RootErrorBoundary` so raw exception details never render in JSX; users see calm guidance plus a 6-character correlation code.
- **Verification / Regression Check:**
  Verified via automated corrupted-JSON, incompatible-intent rejection, block-cascade, and simulated-fault assertions in `test_demo_db.mjs`.
