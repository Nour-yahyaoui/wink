# Vulnerability & Remediation Log

Every security vulnerability found and fixed in **W.I.N.K** is recorded here to maintain a transparent, auditable security history and prevent regressions.

---

## Summary Ledger

| ID | Date | Component | Severity | Vulnerability Summary | Status | Fix / Reference |
|---|---|---|---|---|---|---|
| `SEC-BASE-001` | 2026-10-28 | `wink/server.js` | Baseline | Prototype hardening audit (path traversal, XSS, payload DoS, brute-force, session TTL) | Mitigated in Prototype | [`wink/server.js`](../wink/server.js) |

*(Add every newly discovered vulnerability below in chronological order: `SEC-2026-001`, `SEC-2026-002`, …)*

---

## Entry Template (Copy for Every New Finding)

```markdown
### SEC-2026-XXX — [Short Vulnerability Title]
- **Date Found:** YYYY-MM-DD
- **Date Fixed:** YYYY-MM-DD
- **Discovered By:** @username
- **Affected Component:** `frontend` | `backend` | `database` | `auth` | `vercel-blob` | `infra`
- **Severity:** Critical | High | Medium | Low
- **Status:** Open | Mitigated | Fixed & Verified
- **Vulnerability Description & Impact:**
  What could an attacker do, and what data or service was at risk?
- **Root Cause:**
  Why did this vulnerability exist in code or configuration?
- **Fix Applied:**
  Exact code/config changes made (link to PR / commit SHA).
- **Verification / Regression Check:**
  How we confirmed the vulnerability can no longer be exploited.
```

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
