# `backend/` — Production Backend Service

> **Status:** Planned — Phase 2 service extraction target (see [`/plan/nour.md`](../plan/nour.md))

## Overview
Dedicated backend workspace for **W.I.N.K** API services, intent-matching rules, and plan lifecycle logic.

- **Phase 1:** Backend capabilities start inside the unified Next.js full-stack app on Vercel for fast iteration.
- **Phase 2:** Extracted into this standalone `backend/` service and deployed on **Render** for background request-expiration jobs, status notifications, and independent API scaling.

## Planned Responsibilities
- REST API endpoints consumed by [`frontend/`](../frontend), implementing the FSM-only, mutual-choice meetup rules in [`/plan/iyed.md`](../plan/iyed.md).
- **Google OAuth** session verification and authorization middleware.
- **NeonDB** (PostgreSQL) transactional state transitions via [`database/`](../database).
- Signed **Vercel Blob** upload authorization and media validation.
- Abuse reporting, user blocking, rate limiting, and security telemetry documented in [`/security`](../security).
