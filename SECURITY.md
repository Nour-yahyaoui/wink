# Security Policy

Security is a first-class engineering priority in **W.I.N.K**. Because W.I.N.K connects real students for in-person campus and city meetups, protecting user accounts, personal profiles, uploaded photos, and private chats is non-negotiable.

## Vulnerability Tracking (`/security`)

We maintain an internal, transparent ledger of **every security vulnerability discovered and fixed** inside [`/security/VULNERABILITIES_LOG.md`](./security/VULNERABILITIES_LOG.md).

## Scope

Our security posture covers:
- **Authentication & Sessions:** Google OAuth 2.0 / OIDC integration, session cookies, and authorization checks
- **Database Layer (`database/`):** **NeonDB** (PostgreSQL) query parameterization, access control, and connection security
- **Media Storage:** **Vercel Blob** upload authorization, MIME validation, and size enforcement
- **Application Services (`frontend/`, `backend/`):** XSS/CSRF prevention, rate limiting, security headers (`CSP`, `nosniff`, `Referrer-Policy`), and input validation
- **Prototype (`wink/`):** Zero-dependency reference server hardening

## Reporting a Vulnerability

- **Do NOT open a public GitHub issue** containing active exploit payloads or sensitive data exposure details.
- Contact the maintainers privately via GitHub (`@Nour-yahyaoui` / `@iyedomri`) or use GitHub's **Private Vulnerability Reporting** feature on this repository.
- Once confirmed and patched, every remediated issue is documented in [`security/VULNERABILITIES_LOG.md`](./security/VULNERABILITIES_LOG.md) with root-cause analysis and verification notes.
