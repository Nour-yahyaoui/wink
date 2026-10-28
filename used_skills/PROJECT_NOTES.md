# W.I.N.K — Project Engineering Notes

> Ongoing technical notes, decisions, reminders, and experiments maintained by **Nour (`@Nour-yahyaoui`)**.

---

## 2026-10-28 — Initial Architecture & Stack Decisions

- **Roles:**
  - **Iyed (`@iyedomri`)**: Product creator — writes feature ideas & user flows in [`/plan/iyed.md`](../plan/iyed.md).
  - **Nour (`@Nour-yahyaoui`)**: Technical lead — owns stack, architecture, cloud deployments, and security in [`/plan/nour.md`](../plan/nour.md).
- **Chosen Stack:**
  - **App Strategy:** Start with a **Next.js full-stack app** first, then split into decoupled `frontend/` (**Vercel**) and `backend/` (**Render**) once ready.
  - **Auth:** **Google OAuth** as primary sign-in.
  - **Database:** **NeonDB** (Serverless PostgreSQL) — take advantage of Neon branches for `database-demo` / preview testing.
  - **Image Storage:** **Vercel Blob** for profile photos and meetup media.
- **Pending Before Coding:**
  - Wait for Iyed to populate [`/plan/iyed.md`](../plan/iyed.md), then map his screens & user data directly to our NeonDB schema and Next.js routes.

---

## Scratchpad / Future Notes

- *(Add notes on Google OAuth callback URLs for local dev vs. Vercel preview deployments here)*
- *(Add notes on NeonDB pooled vs. direct connection strings for migrations vs. serverless queries here)*
- *(Add notes on Vercel Blob max upload size & image optimization rules here)*
