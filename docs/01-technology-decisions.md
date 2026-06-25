# Sindbad — Technology Decision Log

**Status:** ✅ Approved by the product owner on **2026-06-25**
**Owner:** Yeldn LLC (USA), sister company Yeldn Health (Egypt). US law governs.
**Approach:** Fully greenfield. Architecture **Option A** (one dedicated API + thin clients). TypeScript end-to-end.

---

## 1. Product in one paragraph
Sindbad ("Powered by Travelers") is a peer-to-peer cross-border shop-&-ship marketplace: it matches **Travelers** (who post **Trips**) with **Shoppers** (who post **Shipments** of items to buy/carry abroad), brokering **Deals** (Box or Basket) with a fee-estimation engine, a multi-currency wallet + escrow (USD base; wallets may hold EGP), a time-weighted Credibility Score, paid KYC verifications, mutual reviews, full-featured real-time chat, complaints, notifications, and an RBAC admin backend with analytics. Four surfaces over one API: **admin web, user web (sindbad.app), iOS, Android.** Bilingual EN/AR with full RTL, mobile-first, dark mode, WCAG AA. Free at launch; monetization mechanisms built but switched off.

## 2. Guiding principles
1. **One backend ("the brain"), many thin clients.** All business logic, data, money, and rules live in a single API; web/admin/mobile are clients. No logic duplicated — essential for a money app.
2. **TypeScript end-to-end** — one language across API, web, admin, and mobile → shared types, shared validation, maximum reuse.
3. **Architect for scale, deploy lean.** Everything runs as cheap open-source containers on one VPS now; each piece has a clear "graduate to managed" path with no rewrite.
4. **Accessibility, RTL, and dark mode are built into the design system from line one**, not bolted on.
5. **Minimize cost.** Prefer self-hosted open-source on the VPS; adopt paid/managed services only when real usage demands it.

## 3. Stack at a glance

| Layer | Choice | Notes |
|---|---|---|
| Language | **TypeScript** everywhere | One language, shared code |
| Backend API | **NestJS** (REST + OpenAPI) | Modules, RBAC guards, validation, jobs, websockets; generates a typed client |
| Database | **PostgreSQL** | ACID for ledger/escrow; relational integrity; JSONB; full-text search |
| ORM | **Prisma** | Type-safe queries + migrations |
| Cache / queue / realtime backplane | **Redis** + **BullMQ** | Background + scheduled jobs; websocket scaling; rate limits |
| Realtime | **Socket.IO** (Nest gateway, Redis adapter) | Chat, presence, read receipts, live notifications |
| User web | **Next.js 15** (App Router) as a **PWA** | SSR/SEO for public pages; installable; i18n/RTL; mobile-first + rich desktop |
| Admin web | **Next.js** (shares UI library) | ~100+ data-heavy screens, nested layouts |
| Design system | **React + Tailwind + shadcn/ui (Radix)** | Brand tokens → Tailwind theme; WCAG-AA; dark mode + RTL via logical properties |
| Forms / data | **Zod** (shared) + React Hook Form + TanStack Query | One validation source for API + clients |
| Object storage | **Self-hosted MinIO** (S3 API) + `sharp` | $0 extra; KYC docs in a private bucket; migrate to managed later by config |
| CDN / DNS / TLS / WAF | **Cloudflare free tier** (optional) | No cost; faster in EG + US; DDoS protection |
| Mobile (Phase 2/3) | **React Native (Expo)** | Native UI, one codebase, reuses TS types/validation/API client |
| Reverse proxy | **Traefik** (auto-TLS) | Routes subdomains to containers |
| Containers | **Docker + Docker Compose** | The VPS is a plain Docker host (no CWP) |
| CI/CD | **GitHub Actions** → GHCR → SSH deploy | Images built in CI; VPS only runs pre-built containers |
| Monitoring | **Sentry** + **PostHog** (GDPR) + uptime monitor | Errors + privacy-friendly product analytics |
| Email | **Postfix** on the VPS (SPF/DKIM/DMARC) + react-email | "Send from our server"; deliverability flagged (see §10) |
| Repo | **pnpm + Turborepo** monorepo | apps/api, apps/web, apps/admin, apps/mobile + shared packages |

## 4. Architecture
```
                         ┌──────────────── Cloudflare (free CDN/DNS/TLS/WAF, optional) ────────────────┐
                         │                                                                             │
  sindbad.app ──────────▶│  Traefik (TLS, routing)                                                     │
  admin.sindbad.app ────▶│     ├── apps/web    (Next.js PWA)  ─┐                                        │
  api.sindbad.app ──────▶│     ├── apps/admin  (Next.js)      ─┼──▶  apps/api (NestJS)  ◀── mobile (RN) │
                         │     └── apps/api    (NestJS)        ─┘            │                          │
                         │                                                  ├── PostgreSQL              │
                         │           worker (BullMQ)  ◀── Redis ────────────┤                          │
                         │           MinIO (media)    Postfix (mail)        └── (jobs, escrow, fees…)   │
                         └─────────────────────────── one VPS, Docker Compose ───────────────────────── ┘
```
All clients (web, admin, mobile) consume the **same NestJS API**. The API is the only thing that touches the database, money ledger, and integrations.

**Monorepo layout**
```
sindbad/
  apps/      api (NestJS) · web (Next.js PWA) · admin (Next.js) · mobile (Expo RN, phase 2/3)
  packages/  shared (types, zod) · ui (components + tokens) · i18n · config
  infra/     docker-compose, traefik, CI
```

## 5. Key decisions & rationale
- **Dedicated NestJS API (Option A)** over a Next.js full-stack monolith: the system has a ledger, escrow, matching, full chat, RBAC, scheduled jobs, and **native mobile clients later** — a structured, standalone API serves all four surfaces identically and ages well. (Trade-off accepted: more upfront structure.)
- **PostgreSQL, money as integer minor units, double-entry ledger, immutable audit trail.** Never floats for money. Every movement in a DB transaction. Base currency **USD**; wallets may hold EGP and pay USD obligations at a daily FX rate + admin spread (fetched by a scheduled job from a free FX API that includes EGP).
- **Fee engine** = pure, heavily unit-tested functions. `Volumetric weight` collected directly per item (+ count). `Fee/item = B · T · (W × volumetricWeight) · C`; `Fee/deal = F + Σ item fees`. **SMART recalibration** = a monthly BullMQ job that back-fits multipliers from executed-deal history and queues them for **admin approval**.
- **Matching** = indexed Postgres queries (countries + receiving-window dates + categories + weight); runs on mission create/update and a periodic sweep. OpenSearch is a clean later upgrade if ever needed.
- **Realtime chat (full v1):** Socket.IO transport; read receipts + edit/unsend as server-side message state; offline-sync via client local storage replayed on reconnect, server as source of truth.
- **Payments & SMS as pluggable adapters.** `PaymentProvider`: Kashier, OPay, Apple Pay (rides on a gateway) in v1; Stripe/PayPal later — all webhook-confirmed. `SmsProvider`: SMS Misr/WE (Egyptian numbers), Twilio/Infobip (international); auto-failover + alternate provider on user-requested resend. Credentials entered in admin; swapping providers never touches business logic.
- **Auth built in-house:** phone-or-email + password + OTP step-up (registration / new device / sensitive actions); Argon2id; rotating refresh tokens (httpOnly cookies on web, secure storage on mobile); **TOTP 2FA for admin**; RBAC via permissions table + Nest guards. Commercial accounts are multi-user (owner invites existing users as managers; full permissions in v1, granular in v2).
- **i18n:** EN + AR (RTL-ready for more). Admin-authored content stored **per language**; user-generated content single-language as entered. **Latin/Western numerals everywhere** (both languages). next-intl on web.
- **Mobile = React Native (Expo):** native app, one codebase, reuses our TypeScript stack — ~half the effort of fully-native Swift+Kotlin with full reuse of types/validation/API client.

## 6. Infrastructure & DevOps
- **One VPS, plain Docker host, clean Ubuntu 24.04 LTS, no CWP.** EU **Frankfurt** region (best EG+US compromise).
- **Lean starting spec:** 8 GB RAM / 4 vCPU / ~120–160 GB NVMe. Builds happen in **CI (GitHub Actions)**; the VPS only runs pre-built containers.
- **Security:** SSH-key-only, firewall (UFW), fail2ban, root password login disabled (existing boxes see hundreds of brute-force attempts).
- **Backups:** nightly `pg_dump` to off-box storage; provider snapshots.

## 7. Scaling path (no rewrite at any step)
1. Now — everything in one Compose stack on the VPS.
2. First pressure — move **Postgres to managed** (PgBouncer pooling + read replica); app stays on VPS.
3. More traffic — run **multiple stateless API/worker containers** (Redis coordinates websockets + jobs) behind Cloudflare load balancing.
4. Heavy — media already on object storage/CDN; add OpenSearch only if matching/search strains Postgres.

## 8. Cost posture
Near-zero added software cost at launch — Postgres, Redis, Traefik, Postfix, BullMQ, MinIO, NestJS, Next.js are free/open-source on the VPS. Cloudflare, Sentry, PostHog have free tiers. Usage-based spend = **SMS** (and later managed DB/storage as it grows). Apple/Google developer accounts already owned.

## 9. Phasing
- **v1 — Web only:** user web (PWA) + admin, fully featured.
- **v2 — Android** (React Native).
- **v3 — iOS** (React Native, same codebase).

**v2 feature backlog (deferred):** insurance, granular commercial-manager permissions, push notifications (FCM/APNs), Google Maps + current location, editable analytics-dashboard builder, SMART-fee auto-calibration tuning.

## 10. Deferred risk flags (to address before launch)
1. **AML/fraud:** withdrawals require no identity verification + free user-to-user transfers → recommend verified identity before first withdrawal + velocity limits.
2. **GDPR vs. indefinite retention:** KYC docs + blocked-user identifiers kept indefinitely → needs a documented retention policy + lawful basis.
3. **Self-hosted email deliverability:** sending from our own server risks spam-foldering → configure SPF/DKIM/DMARC; consider a relay if inbox placement is poor.

## 11. Open items
- Repo not yet initialized locally and **not pushed to GitHub** — awaiting explicit go-ahead before any remote push.
- New lean VPS to be procured by the owner.
