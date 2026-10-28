# W.I.N.K 🤝

> **No friends? No problem.**  
> A people-first campus meetup platform connecting students at **FSM (Faculté des Sciences de Monastir)** and **Monastir** through shared hobbies.

---

## 👥 Team & Planning (`/plan`)

W.I.N.K is built with a clear separation between **product vision** and **technical architecture**—planned first inside [`/plan`](./plan) before implementation:

| Role | Lead | Blueprint |
|---|---|---|
| **Product Creator & Vision** | **Iyed Omri** ([@iyedomri](https://github.com/iyedomri)) | [`plan/iyed.md`](./plan/iyed.md) |
| **Technical Lead & Security Architect** | **Nour Yahyaoui** ([@Nour-yahyaoui](https://github.com/Nour-yahyaoui)) | [`plan/nour.md`](./plan/nour.md) |

---

## 🛠️ Planned Production Stack

- **Phase 1 (Unified Full-Stack):** **Next.js** full-stack application deployed on **Vercel** for rapid iteration on the product specs in [`plan/iyed.md`](./plan/iyed.md).
- **Phase 2 (Service Split):** Dedicated **Next.js** `frontend/` on **Vercel** + standalone `backend/` API & real-time service on **Render**.
- **Authentication:** **Google OAuth**
- **Database:** **NeonDB** (Serverless PostgreSQL)
- **Media & Image Storage:** **Vercel Blob**

---

## 📁 Repository Structure

```text
.
├── plan/                 # Role-based blueprints before coding
│   ├── iyed.md           # Product vision, user flows & UX specs (@iyedomri)
│   └── nour.md           # Technical stack, architecture & infra plan (@Nour-yahyaoui)
│
├── frontend/             # Production Next.js frontend (Vercel + Google OAuth + Vercel Blob)
├── frontend-demo/        # Demo & UI prototyping frontend sandbox
├── backend/              # Production backend service (Phase 2 Render split)
├── backend-demo/         # Demo & prototype backend sandbox
├── database/             # Production NeonDB (PostgreSQL) schemas & migrations
├── database-demo/        # Seed scripts, fixtures & preview-branch demo datasets
│
├── security/             # Ledger of every security vulnerability found & fixed
├── used_skills/          # AI-learned skills, engineering patterns & project notes
├── wink/                 # Initial zero-dependency Node.js concept prototype
│
├── CONTRIBUTORS.md       # Project creators & roles
├── CONTRIBUTING.md       # Workflow, branch & PR conventions
├── SECURITY.md           # Security policy & responsible disclosure
├── CODE_OF_CONDUCT.md    # Community standards
└── LICENSE               # MIT License
```

---

## ⚡ Running the Initial Concept Prototype (`/wink`)

While Phase 1 awaits product alignment in [`plan/iyed.md`](./plan/iyed.md), you can run the original zero-dependency concept demo (Node.js `>= 18`):

```bash
cd wink
node server.js
```

- **Presentation Deck:** `http://localhost:8000`
- **Demo App:** `http://localhost:8000/app`
- **Prototype Docs & REST API:** [`wink/README.md`](./wink/README.md)

---

## 📄 Governance & License

- **Contributors:** [`CONTRIBUTORS.md`](./CONTRIBUTORS.md)
- **Contributing Guide:** [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- **Security Policy & Vulnerability Log:** [`SECURITY.md`](./SECURITY.md) · [`security/VULNERABILITIES_LOG.md`](./security/VULNERABILITIES_LOG.md)
- **License:** [MIT](./LICENSE)
