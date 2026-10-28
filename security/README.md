# `security/` — Security Engineering & Vulnerability Registry

This folder tracks **every single security vulnerability discovered and remediated** across **W.I.N.K** (`frontend`, `backend`, `database`, demo sandboxes, dependencies, and cloud configuration).

## Files in This Directory

- **[`VULNERABILITIES_LOG.md`](./VULNERABILITIES_LOG.md)** — Chronological ledger of every vulnerability found, its root cause, severity, remediation commit/PR, and verification steps.
- *(See also root [`SECURITY.md`](../SECURITY.md) for responsible disclosure policy.)*

## Severity Levels

| Severity | Criteria | Target Remediation |
|---|---|---|
| **Critical** | Auth bypass, remote code execution, SQL injection, leaked production credentials, unauthorized data/blob overwrite | Immediate hotfix |
| **High** | Stored XSS, IDOR / broken object-level authorization, CSRF on state-changing actions, unrestricted file upload | Before next deployment |
| **Medium** | Missing rate limits, weak session flags, verbose error leakage, permissive CORS/CSP | Current sprint |
| **Low / Info** | Missing defense-in-depth headers, non-exploitable dependency advisories, minor hardening improvements | Scheduled cleanup |

## Mandatory Workflow When a Vulnerability Is Found

1. **Do not commit active exploits or live secrets** into any markdown file or test fixture.
2. Assign the next sequential ID (`SEC-2026-XXX`) in [`VULNERABILITIES_LOG.md`](./VULNERABILITIES_LOG.md).
3. Document **Component**, **Severity**, **Discovery Date**, **Description & Impact**, **Root Cause**, **Fix Implemented**, and **Verification / Regression Test**.
4. Reference the `SEC-2026-XXX` ID in the fix commit message and Pull Request description (`sec: fix SEC-2026-XXX ...`).

## Stack-Specific Security Checklist (Phase 1 & Phase 2)

- [ ] **Google OAuth:** Validate `state` / PKCE, enforce verified email claims, use `HttpOnly; Secure; SameSite=Lax` cookies, rotate session tokens on sign-in.
- [ ] **NeonDB (PostgreSQL):** Use parameterized queries / prepared statements exclusively; enforce least-privilege DB credentials and SSL (`sslmode=require`).
- [ ] **Vercel Blob:** Require authenticated server-side upload tokens, strict MIME allowlist (`image/jpeg`, `image/png`, `image/webp`), max file size caps, and unpredictable blob filenames.
- [ ] **Next.js & Render API:** Enforce strict `Content-Security-Policy`, CORS origin allowlists (Phase 2 split), per-IP + per-user rate limiting, and Zod/schema validation on every request body.
- [ ] **Secrets Hygiene:** Keep all `.env*` secrets out of Git; audit commits and dependencies continuously.
