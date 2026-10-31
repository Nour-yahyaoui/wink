# `database/` — Production Database Layer (NeonDB)

> **Status:** Planned — awaiting final sign-off on open decisions in [`/plan/iyed.md`](../plan/iyed.md)

## Overview
Production relational database workspace targeting **NeonDB (Serverless PostgreSQL)**.

## Planned Schema Focus (Aligned with `/plan/iyed.md` & `/plan/nour.md`)
- **Identity & Auth:** `users`, `oauth_accounts` (Google OAuth), and FSM eligibility metadata.
- **Structured Activity Requests:** `activity_requests` with explicit `activity`, `purpose`, `role_needed`, `availability`, and `fsm_location` fields so incompatible intents never match.
- **Mutual Choice & Logistics:** `choices`, `meet_proposals`, and transactional plan status tracking (`open`, `pending_mutual`, `arranging_details`, `confirmed`, `completed`, `cancelled`, `expired`).
- **Media & Safety:** `media_blobs` (**Vercel Blob** URLs & metadata), `reports`, and `blocks`.
- **Migrations & Security:** Version-controlled SQL/ORM migrations and strictly parameterized queries.
