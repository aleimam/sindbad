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

## Status
Planning & design **complete**. Build starting at **Phase 0 — foundation & scaffolding** (web v1).
