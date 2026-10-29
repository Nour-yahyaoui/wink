# `database-demo/` — Browser `localStorage` DB Engine & FSM Mock Data

> **Status:** Active & Deployed in the Vercel Demo (`wink_fsm_demo_db_v1`)

## Overview
Zero-backend, strongly typed **`localStorage` relational-style database adapter** and **FSM (Faculté des Sciences de Monastir)** mock dataset powering [`frontend-demo/`](../frontend-demo).

Designed as clean, portable example code demonstrating how W.I.N.K's data model, 5-axis compatibility rules, and mutual-choice state transitions work before connecting **NeonDB (PostgreSQL)** in production [`database/`](../database).

## Files

| File | Responsibility |
|---|---|
| [`types.ts`](./types.ts) | TypeScript schemas for `StudentProfile`, `ActivityRequest`, `MutualMatchRecord`, `SafetyReport`, `BlockRecord`, and `CompatibilityEvaluation`. |
| [`mockData.ts`](./mockData.ts) | 6 verified FSM student personas, 6 public FSM campus venues, activity/purpose/role taxonomies, and 9 contrasting mock requests across `open`, `pending_mutual`, `arranging_details`, and `confirmed` states. |
| [`localStorageDb.ts`](./localStorageDb.ts) | Safe `localStorage` persistence (`readDemoDbSync`, `persistDbSync`) with schema self-healing, `AbortSignal` support, 5-axis compatibility engine (`evaluateCompatibility`), mutual-choice transactions, and fault simulation (`wink_fsm_simulate_fault`). |
