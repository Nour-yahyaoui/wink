# `backend/` — Production Backend Service

> **Status:** Planned — Phase 2 service extraction target (see [`/plan/nour.md`](../plan/nour.md))

## Overview
Dedicated backend workspace for **W.I.N.K** API services, business logic, and real-time communication.

- **Phase 1:** Backend capabilities start inside the unified Next.js full-stack app to maximize early iteration speed.
- **Phase 2:** Extracted into this standalone `backend/` service and deployed on **Render** to handle persistent connections (WebSockets / real-time chat), background jobs, and independent API scaling.

## Planned Responsibilities
- REST / real-time API endpoints consumed by [`frontend/`](../frontend).
- **Google OAuth** token/session verification and authorization middleware.
- **NeonDB** (PostgreSQL) data access via [`database/`](../database).
- Signed **Vercel Blob** upload authorization and media validation.
- Rate limiting, input sanitization, and security telemetry documented in [`/security`](../security).
