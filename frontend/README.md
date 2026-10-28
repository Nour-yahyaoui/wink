# `frontend/` — Production Web Application

> **Status:** Planned — awaiting product specification in [`/plan/iyed.md`](../plan/iyed.md)

## Overview
Production frontend for **W.I.N.K**, built with **Next.js** and deployed on **Vercel**.

- **Phase 1:** Houses the unified **Next.js full-stack application** (UI + initial route handlers/server actions).
- **Phase 2:** Operates as the dedicated Next.js client/SSR frontend communicating with the standalone [`backend/`](../backend) service on Render.

## Planned Integrations
- **Product Flows & UI:** Implemented directly from [`/plan/iyed.md`](../plan/iyed.md).
- **Authentication:** **Google OAuth** sign-in and session management.
- **Media Uploads:** Profile and meetup photo uploads backed by **Vercel Blob**.
- **Deployment:** **Vercel** (production + automatic PR preview environments).

See [`/plan/nour.md`](../plan/nour.md) for the complete technical architecture.
