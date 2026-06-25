# Sindbad — Build Plan (web v1)

**Status:** ⏳ draft for review — 2026-06-25.
No deadline → **quality first**. Build in **reviewable increments**, each milestone deployed to a **staging** environment on the VPS so it can be run and seen.

## Principles
- **One vertical slice first** to de-risk the whole stack, then **go wide** module by module.
- Every module ships complete: **API + web + admin + tests + i18n keys + migrations**.
- **Money, fees, ledger, and state machines get the heaviest tests.**
- Continuous deploy to staging; `main` always green.
- TypeScript end-to-end; shared types + Zod validation from `packages/shared`.

## Testing strategy
- **Unit (Vitest):** pure logic — fee engine, ledger postings, credibility, matching, state-machine guards. Highest coverage on money.
- **Integration (Supertest):** API endpoints + DB + RBAC.
- **E2E (Playwright):** critical flows (register → post → match → deal → complete; deposit → pay; verification).
- **CI (GitHub Actions):** lint + typecheck + unit + integration on every PR; e2e on `main`.

## Phases

### Phase 0 — Foundation & scaffolding
Goal: a running, deployable skeleton.
- Monorepo (pnpm + Turborepo): `apps/{api,web,admin}`, `packages/{shared,ui,config,i18n}`.
- Tooling: TS, ESLint, Prettier, Vitest, Playwright; GitHub Actions CI → GHCR images.
- Local dev: Docker Compose (Postgres, Redis, MinIO, MailHog).
- API skeleton: NestJS (config, health, OpenAPI, error filter, logging, Zod validation pipe).
- DB: Prisma + migrations + seed runner.
- Design system: Tailwind preset from brand tokens; base components (Button, Input, Card, Pill, Badge, Chip, Avatar, Header, TabBar, Modal, Toast); dark mode; RTL; next-intl EN/AR; the logo lockup.
- Next.js shells (web PWA + admin) wired to API + design system + auth guard.
- Traefik + Cloudflare + first staging deploy on the VPS.

### Phase 1 — Identity + the walking skeleton  ⟵ de-risk the whole stack
- Auth: register (email/phone + password), OTP (SMS adapter + one live provider), login, JWT access/refresh (httpOnly), password reset, multi-device sessions.
- Users/Accounts: User · Account (Personal/Commercial) · AccountMember (Owner/Manager) · profile basics · BlockedIdentity check.
- Admin: login + TOTP 2FA + RBAC scaffolding + permission guards.
- Thin slice (minimal but real): post Trip → post Shipment → basic match → Request → Deal accept → advance steps → Complete (money stubbed).
- Outcome: API ↔ web ↔ admin ↔ Postgres ↔ Redis ↔ Socket.IO proven end-to-end, on staging.

### Phase 2 — Marketplace core
- Catalogs: Countries (+states, price param), Categories (+groups, T) + **seed the initial category list**, System settings, Static-page model.
- Missions: Trip (full fields; optional receiving-start; private trip date; weight depletion incl. cyclic rule; verification upload; approval; edit rules + ChangeRequest) · Shipment (Box/Basket; items with volumetric weight + count + declared value + photos; edit rules).
- Matching engine: full criteria (countries/window/categories/weight) + Ask-flag; on-create/update + periodic sweep; match notifications; matched lists on mission pages.
- Deal lifecycle: full Box + Basket state machines (actors, guards, flags, resolution green-flag, cancellation + staff approval, receiving-window auto-cancel).
- Admin: Trips approval, Edit approvals, Deals (intervene/cancel/resolve), Shipments, Reviews moderation shell.
- Media pipeline: upload (drag/paste) → compress + thumbnails (sharp) → MinIO; expandable viewer.

### Phase 3 — Money (highest rigour)
- Wallet + **double-entry ledger** (integer minor units, immutable, audit); chart of accounts.
- Escrow flows: Box (fee), Basket (fee + price), Variable (estimate → reconcile); release/refund hooks on the deal state machine.
- Fee engine: `B·T·W·C + F`; the worked examples become tests; "copy estimate" in forms.
- FX: daily rate job + admin spread; pay-USD-from-EGP.
- Payments: PaymentProvider adapters (Kashier, OPay, Apple Pay) + webhooks; deposits (card/Apple Pay instant; Instapay/bank manual + reference matching); withdrawals (manual + funds hold); transfers (OTP + AML caps); bank accounts; transactions + filter/sort + CSV/PDF export.
- Admin Finance: deposits confirm, withdrawals execute, ledger explorer, adjustments, FX rates, gateways config.
- SMART recalibration: monthly job → admin approval → formula update.

### Phase 4 — Trust & engagement
- Verification/KYC: VerificationType (admin-config), paid request (fee kept on rejection), statuses, 5-sec liveness capture, private attachments, admin review; social-account code method.
- Credibility: CredibilityEvent log, weekly recompute job, time-weighting (0–12 / 13–36 / >36), tiers, global display.
- Reviews: blind window (open +12h, close +12d, reveal), response, delete-no-edit; flags Outstanding/Follow/Block.
- Favorites / Contacts.

### Phase 5 — Communication
- Chat: Socket.IO (Redis adapter); thread eligibility (past deal or active match, not blocked); messages + compressed attachments; read receipts; edit (15 min) + unsend; reply; offline-sync (client store + replay); floating widget + header unread counts; admin chat monitor.
- Notifications: in-app + email (own SMTP) + SMS; NotificationType (admin-extensible); per-user preferences; admin composer (user/segment/all). *(Push = v2.)*

### Phase 6 — Support, content & analytics
- Complaints (vs Request/Deal/Chat) + ModerationAction (deduct/hold/block); blocked-user rules (re-registration block; ongoing-only access).
- Static pages CMS (per-language, publish/unpublish, URL).
- Analytics: user analytics + admin dashboard (fixed v1, rich KPIs).
- Staff/Teams/Permissions (full granular RBAC) + immutable Audit log; System settings UI.

### Phase 7 — i18n / RTL / accessibility / PWA
- Complete EN + AR copy; RTL QA on every screen; Latin numerals.
- WCAG AA pass (contrast, focus, labels, tap targets).
- PWA (installable, offline shell, app icons); dark-mode QA across all screens.

### Phase 8 — Hardening & launch
- Security: authz review, rate limits, input validation, secrets, KYC privacy, the deferred **AML / GDPR / email** risk flags.
- Performance: DB indexes, query/caching review, load test toward early-traffic targets.
- Email deliverability (SPF/DKIM/DMARC); backups (nightly pg_dump off-box); monitoring (Sentry, PostHog, uptime) + runbooks.
- Production deploy (Docker Compose, Traefik, Cloudflare, DNS, TLS); UAT → **launch web v1**.

## After v1
- **v2 — Android (React Native)** + backlog: push (FCM/APNs), insurance, Google Maps + current location, granular commercial-manager permissions, editable analytics dashboard.
- **v3 — iOS (React Native)** — same codebase.

## Repo & environments
- Local: Docker Compose. Staging + Production: VPS (Docker Compose, Traefik, Cloudflare). Images built in CI (GHCR).
- Git: feature branch → PR → CI green → merge to `main` → auto-deploy to staging. **Remote push to GitHub only on the owner's explicit go-ahead.**
