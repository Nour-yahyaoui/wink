# `database/` — Production Database Layer (NeonDB)

> **Status:** Planned — schema design pending [`/plan/iyed.md`](../plan/iyed.md) sign-off

## Overview
Production relational database workspace targeting **NeonDB (Serverless PostgreSQL)**.

## Planned Contents
- **Schema Definitions:** Core tables for `users`, `oauth_accounts`, `profiles`, `hobbies`, `meetups`, `meetup_participants`, `messages`, `reviews`, and `media_blobs` (storing **Vercel Blob** URLs and metadata).
- **Migrations:** Version-controlled, repeatable SQL / ORM migrations.
- **Indexes & Constraints:** Referential integrity, unique constraints, and query performance indexes.
- **Security Rules:** Parameterized query helpers and least-privilege database role guidelines.

See [`/plan/nour.md`](../plan/nour.md) for how `database/` connects to Phase 1 (Next.js on Vercel) and Phase 2 (Render backend).
