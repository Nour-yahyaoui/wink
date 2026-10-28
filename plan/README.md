# `/plan` — W.I.N.K Planning & Architecture Workspace

This directory is the single source of truth for planning **W.I.N.K** before any production feature code is written.

## Ownership & Roles

| File | Owner | Role & Responsibility |
|---|---|---|
| [`iyed.md`](./iyed.md) | **Iyed Omri** (`@iyedomri`) | **Product Creator & Vision** — Core concept, user flows, screens, campus meetup experience, and feature priorities. |
| [`nour.md`](./nour.md) | **Nour Yahyaoui** (`@Nour-yahyaoui`) | **Technical Lead & Architect** — System architecture, tech stack, Google OAuth, NeonDB, Vercel Blob, cloud deployment, repo structure, and security engineering. |

## How We Work Together

1. **Product First (`iyed.md`)** — Iyed writes and updates the product vision, screens, and user experience requirements inside [`iyed.md`](./iyed.md).
2. **Technical Blueprint (`nour.md`)** — Nour defines the technical stack, system design, data layer, infrastructure, and security model inside [`nour.md`](./nour.md).
3. **Review Before Code** — Neither production nor demo implementations begin until ideas are documented and aligned here. Once agreed, `frontend/` reads directly from `iyed.md` for product behavior and `nour.md` for technical implementation.
