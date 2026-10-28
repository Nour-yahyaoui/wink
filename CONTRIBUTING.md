# Contributing to W.I.N.K 🤝

Thanks for helping build **W.I.N.K**! To keep product decisions, technical architecture, and security aligned, we follow a structured workflow.

---

## 1. Plan Before Code (`/plan`)

We separate **product ideas** from **technical architecture** inside [`/plan`](./plan):

- **Product & UX Ideas → [`plan/iyed.md`](./plan/iyed.md)** (maintained by `@iyedomri`)
- **Technical Stack, Infra & Data Architecture → [`plan/nour.md`](./plan/nour.md)** (maintained by `@Nour-yahyaoui`)

> **Rule:** Major UI flows or architectural changes should be documented in `/plan` and agreed upon before implementing inside `frontend/`, `backend/`, or `database/`.

---

## 2. Repository Workspaces

| Folder | Track | Purpose |
|---|---|---|
| `frontend/` | Production | Next.js application (Vercel) + Google OAuth + Vercel Blob uploads |
| `frontend-demo/` | Demo | Sandboxed UI experiments and mock-data showcase |
| `backend/` | Production | Standalone backend API & real-time service (Phase 2 Render split) |
| `backend-demo/` | Demo | Prototype API endpoints and local sandboxes |
| `database/` | Production | NeonDB (PostgreSQL) schemas, migrations, and queries |
| `database-demo/` | Demo | Seed scripts, fixtures, and preview-branch test data |
| `security/` | Engineering | Log of every security vulnerability discovered and fixed |
| `used_skills/` | Engineering | AI-learned skills, reusable patterns, and project notes |
| `wink/` | Prototype | Initial zero-dependency concept prototype |

---

## 3. Branching & Pull Request Workflow

1. Create a descriptive feature/docs/fix branch from `main`.
2. Keep commits focused and follow clear prefixes:
   - `feat:` — New user-facing or API feature
   - `fix:` — Bug fix
   - `sec:` — Security vulnerability remediation (must also update [`security/VULNERABILITIES_LOG.md`](./security/VULNERABILITIES_LOG.md))
   - `docs:` — Planning, README, or notes updates
   - `chore:` — Tooling, config, or workspace maintenance
3. Never commit `.env` files, API keys, Google OAuth client secrets, NeonDB URLs, or Vercel Blob tokens.
4. Open a Pull Request filling out `.github/PULL_REQUEST_TEMPLATE.md` and request review before merging.

---

## 4. Security & Knowledge Tracking

- **Found & fixed a security bug?** Record every finding in [`security/VULNERABILITIES_LOG.md`](./security/VULNERABILITIES_LOG.md) with root cause and verification steps.
- **Learned a reusable engineering or AI workflow pattern?** Document it in [`used_skills/SKILLS_LOG.md`](./used_skills/SKILLS_LOG.md) or [`used_skills/PROJECT_NOTES.md`](./used_skills/PROJECT_NOTES.md).

By contributing to this project, you agree to abide by our [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) and license your contributions under the [`LICENSE`](./LICENSE) (MIT).
