# AI Learned Skills Log — W.I.N.K

A living repository of technical skills, workflow conventions, and project-specific patterns learned while building **W.I.N.K**.

---

## Skill Entry Template

```markdown
## SKILL-XXX: [Skill Name]
- **Date:** YYYY-MM-DD
- **Category:** Architecture | Auth | Database (NeonDB) | Storage (Vercel Blob) | Next.js | Deployment | Security | Collaboration
- **Context:** What problem or task triggered learning this skill?
- **Key Takeaway / Pattern:** Step-by-step reusable rule or implementation pattern.
- **Pitfalls to Avoid:** Common mistakes to watch out for.
```

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
  - Never implement frontend screens before `plan/iyed.md` defines the intended user flow.
  - Never mix demo/mock storage tricks into production `database/` or `backend/` modules.
