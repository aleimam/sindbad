# Sindbad

**Powered by Travelers** — a peer-to-peer, cross-border shop-&-ship marketplace that matches **Travelers** (who post Trips) with **Shoppers** (who post Shipments), brokering **Deals** with escrow, a credibility score, paid verification, mutual reviews, real-time chat, and an RBAC admin backend.

Owned by **Yeldn LLC** (US).

## Surfaces
Admin web · User web (PWA, `sindbad.app`) · iOS · Android — all over **one shared API**.
Bilingual **EN / AR (RTL)**, mobile-first, dark mode.

## Tech
TypeScript end-to-end · **NestJS** API · **PostgreSQL + Prisma** · **Redis + BullMQ** · **Socket.IO** · **Next.js** (user web + admin) · **React Native** (mobile, phases 2–3) · self-hosted **MinIO** · **Docker** on a VPS behind **Cloudflare**.
Full rationale: [`docs/01-technology-decisions.md`](docs/01-technology-decisions.md).

## Documentation
Every decision is recorded in [`/docs`](docs/README.md):

| | |
|---|---|
| [01 — Technology decisions](docs/01-technology-decisions.md) | The approved stack and why |
| [02 — Domain blueprint](docs/02-domain-blueprint.md) | Entities, state machines, money & ledger, business rules |
| [03 — UX / information architecture](docs/03-ux-information-architecture.md) | Navigation, site maps, screen inventory, flows |
| [04 — Design system](docs/04-design-system.md) | Brand tokens → theme, components, RTL/dark mode |
| [05 — Build plan](docs/05-build-plan.md) | Programming phases & module sequence |
| [06 — Deployment runbook](docs/06-deployment.md) | Production topology, first deploy, CI/CD, ops |

## Status
**LIVE in production** at [sindbad.app](https://sindbad.app) (+ [admin](https://admin.sindbad.app) · [api](https://api.sindbad.app/api/health)) since 2026-07-10 — web v1 with all planned features, deployed on a Hetzner VPS with HTTPS, nightly backups, and CI/CD auto-deploy on every push to `main` (gated by the test suite).

Email/SMS/payment-gateway adapters are built but **dormant pending credentials**; Terms & Privacy pages are drafted awaiting legal review. See **[HANDOFF.md](HANDOFF.md)** for the complete current state, the waiting list, and how to continue work.
