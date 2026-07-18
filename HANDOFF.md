# Project Handoff — Sindbad

_Last updated: 2026-07-19 · Written so a new Claude session (on any account) can continue this project with zero prior context._

## What this project is

**Sindbad** (sindbad.app, owned by Yeldn LLC, US) is a peer-to-peer cross-border shop-&-ship marketplace: **Shoppers** post Shipments (things they want from abroad), **Travelers** post Trips (spare luggage capacity), and the platform matches them into escrow-protected **Deals** with a multi-currency wallet (USD + EGP), credibility scores, paid verifications, mutual reviews, real-time chat, complaints, and an RBAC admin backend. Bilingual EN/AR with full RTL, Latin numerals everywhere, mobile-first PWA, dark mode. Free at launch (fee machinery built but set to zero). Web v1 is done; Android (React Native) is phase 2, iOS phase 3 — not started.

## Current status

**LIVE IN PRODUCTION since 2026-07-10** and stable. All web-v1 features are built, tested (131 unit tests), and deployed. The only things between "live" and "real public users" are credentials the owner hasn't supplied yet (email/SMS/payment — see waiting list) and a legal review of Terms/Privacy. There is **no unfinished code** — every started feature was completed and deployed.

- **User web:** https://sindbad.app (EN + `/ar` RTL) · **Admin:** https://admin.sindbad.app · **API:** https://api.sindbad.app/api/health (Swagger at `/api/docs`)
- ~125 REST routes + Socket.IO chat, 17 Prisma migrations, monorepo of 4 apps/packages

## Production infrastructure (everything you need to operate it)

- **Server:** Hetzner CX33 (4 vCPU / 8 GB / 80 GB), Ubuntu 24.04, Helsinki. IPv4 **65.21.176.164**. Hetzner console project "Sindbad" (owner's account).
- **SSH from this computer:** `ssh -i ~/.ssh/sindbad_ed25519 root@65.21.176.164` (personal key) or `ssh -i ~/.ssh/sindbad_ci_deploy deploy@65.21.176.164` (the CI key, non-root `deploy` user). Both private keys live in `C:\Users\aleim\.ssh\`.
- **App root on server:** `/opt/sindbad` (git clone via a read-only GitHub deploy key in `~deploy/.ssh/github_deploy`). Stack runs under `docker compose -f docker-compose.prod.yml --env-file .env` (project name `sindbad`): Traefik v3.5 (TLS via Let's Encrypt, **file provider** — see gotchas), api, web, admin, Postgres 16, Redis 7, MinIO, and a `migrate` one-shot.
- **Secrets:** all in `/opt/sindbad/.env` on the server (mode 600, owner `deploy`) — DB/MinIO/JWT secrets and the **super-admin login** (`SEED_ADMIN_EMAIL` = egyptvitaminsshare@gmail.com, `SEED_ADMIN_PASSWORD`). Never committed; template is `.env.production.example`.
- **DNS:** sindbad.app on Cloudflare — 4 A records (@, www, api, admin) → the server IP, currently **DNS-only (grey cloud)**.
- **Backups:** nightly `pg_dump` at 03:15 via `deploy` crontab → `/opt/sindbad/backups/` (gzip, 14-day retention, `scripts/backup.sh`). Off-box copies not yet arranged.
- **CI/CD:** push to `main` → GitHub Actions `ci.yml` (build + typecheck + **all tests**) → `deploy` job SSHes in and runs `scripts/deploy.sh` (git reset → build images → **`compose run --rm migrate`** → `up -d` → health-wait → prune). Repo secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY_B64` (base64 single-line private key — see gotchas). Manual deploy anytime: `ssh -i ~/.ssh/sindbad_ci_deploy deploy@65.21.176.164 "cd /opt/sindbad && ./scripts/deploy.sh"`.

## Done in the latest sessions (July 10–11)

Deployment + post-launch hardening, in order: server provisioning/hardening (UFW, fail2ban, swap, deploy user) → first deploy with 3 real fixes (see gotchas) → nightly backups → production smoke test (found OTP goes only to logs — no real delivery) → **email/SMS providers built** (SMTP via nodemailer + Twilio + SMS Misr with +20-routing; config-activated, currently dormant → dev logger) → **rate limiting** (@nestjs/throttler, global 120/min + tight `@Throttle` on auth/OTP; `trust proxy` set) → CI/CD auto-deploy debugged end-to-end (3 GitHub-side issues) → **legal pages** applied to the live DB (About/Guide/FAQ/Contact **published** EN+AR; Terms/Privacy drafted, **unpublished pending legal review**) → **payment-gateway adapters** (Kashier + OPay card deposits: hosted checkout → signature-verified public webhook → idempotent atomic wallet credit; dormant without credentials) → deploy-script fix so migrations always apply → code review (fixed a broken-in-prod chat Redis adapter, a webhook race, more) → **offline chat sync hardened** (claim-based serialized outbox, poison-queue fix, app-wide flush, 9 new web tests) → **fixed a major session bug: web/admin clients never refreshed the 15-min access token; both now do transparent 401→refresh→retry** → PNG PWA icons (rasterized on the server; apple-touch uses full-bleed art).

## In progress / not finished

Nothing is mid-flight in code. Open items are all **waiting on the owner**:

| Waiting item | What it unblocks | How to activate |
|---|---|---|
| **Resend** API key + domain DNS verify (_owner postponed this_) | Real email OTP → **real signups** | Add `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER=resend`, `SMTP_PASS=<key>`, `SMTP_FROM` to server `.env` → restart api. No rebuild. |
| SMS Misr (username/password/NTRA-approved sender) + Twilio (SID/token/from) | Phone OTP (most Egyptian users) | `SMSMISR_*` / `TWILIO_*` in `.env` → restart api. +20 routes to SMS Misr, rest to Twilio. |
| Kashier / OPay merchant credentials | Card deposits | `KASHIER_*` / `OPAY_*` + `PUBLIC_WEB_URL` in `.env` → restart api. ⚠️ Endpoint paths & webhook signature formulas follow public docs — **verify against the live merchant dashboards before real money**. |
| Cloudflare grey→orange flip | CDN/DDoS protection | Proxy the 4 records, SSL mode Full (strict), then set `TRUST_PROXY_HOPS=2` in `.env` → restart api (rate-limit IPs stay correct). |
| Lawyer review of Terms/Privacy + real Yeldn LLC address | Publishing the last 2 legal pages | Edit/publish via admin CMS (Catalogs & Settings → Static pages), or edit `apps/api/prisma/pages-content.mjs` + run `docker compose exec -T api node prisma/apply-pages.mjs`. |
| AML decision: KYC-before-withdrawal + velocity limits | Compliance before real money | Owner decision, then build enforcement. See `Issues.txt` (root) — the standing risk flags (AML, GDPR retention, deliverability). |

## Next steps

1. When the owner supplies any credential above: add to `/opt/sindbad/.env`, `docker compose -f docker-compose.prod.yml restart api`, check boot log shows the provider active, then **re-run the registration smoke test** (register → real OTP arrives → verify → login) and clean up the test user.
2. Once email works: full runtime E2E on production (register 2 users → trip + shipment → match → deal → escrow → advance → complete → review → chat → complaint → admin queues), then flip Cloudflare orange and announce.
3. After launch settles: Android app (React Native, phase 2) against the same API.

## Key files — where everything is

- `HANDOFF.md` — this file. `README.md` — overview + live status. `Issues.txt` — owner's standing risk flags.
- `docs/01…06` — every decision: stack, domain blueprint (entities/state machines/money), UX/IA, design system, build plan, **deployment runbook (06 — read this before touching the server)**.
- `sindbad-brand-identity-standalone.html` — **the only design reference** (owner's explicit rule).
- `apps/api` — NestJS 11 + Prisma 6. Feature modules under `src/` (auth, admin/RBAC, accounts, missions, matching, deals, money, trust, chat, media, support, messaging…). Pure logic has colocated `*.spec.ts` (122 tests). `prisma/schema.prisma` + `prisma/migrations/` + `seed.mjs` (idempotent) + `pages-content.mjs`/`apply-pages.mjs` (legal-page content).
- `apps/web` — Next.js user PWA (`src/app/[locale]/…`, next-intl EN/AR). Notable: `lib/api.ts` (client with transparent token refresh), `lib/chat-outbox.ts` (+9 tests), `components/pwa.tsx` (SW registration, offline banner, app-wide outbox flush), `public/sw.js`, `public/icons/`.
- `apps/admin` — Next.js admin (sidebar per `(dash)/` routes: complaints, pages CMS, deposits, withdrawals, trip approvals, FX…). `lib/api.ts` also auto-refreshes.
- `packages/shared` — Zod schemas + permission catalog (single source of validation, used by API and clients). `packages/i18n` — `en.json`/`ar.json` (keep keys in sync!). `packages/ui` — shared React components.
- `docker-compose.prod.yml` + `infra/traefik/dynamic/dynamic.yml` (routing) + `scripts/deploy.sh` + `scripts/backup.sh` + `.github/workflows/ci.yml` + `.env.production.example`.

## Important context, decisions & gotchas (hard-won — read before changing things)

**This Windows dev machine:**
- **No Docker locally; `sharp` is broken locally** (fails on any operation). Migrations are generated **offline**: `git show HEAD:apps/api/prisma/schema.prisma > _old.prisma` then `prisma migrate diff --from-schema-datamodel _old.prisma --to-schema-datamodel schema.prisma --script` into a hand-named `prisma/migrations/<timestamp>_<name>/migration.sql`. Image work (sharp) runs on the server inside the api container (import sharp by absolute path `/app/node_modules/sharp/lib/index.js`; `docker cp` sources arrive root-owned — write output to a dir created by the container user).
- Next `output: 'standalone'` is **gated on `BUILD_STANDALONE=1`** (set in Dockerfiles) because Windows can't emit standalone (symlink EPERM). Passwords hash with **@node-rs/argon2** (classic argon2 fails node-gyp here). JWT TTL is a **seconds number**, not a duration string.

**Production lessons already paid for (don't rediscover):**
- `pnpm deploy` needs `--legacy` on pnpm v10. `@sindbad/shared` needs `files:["dist"]` (dist is gitignored; without it the API image gets an empty package).
- **Traefik must use the file provider** (`infra/traefik/dynamic/`): Docker Engine 29 rejects Traefik's docker-provider socket API (all v3 versions, env override ignored). Routing changes = edit that YAML.
- `docker compose up -d` does **not** re-run an exited one-shot — that's why `deploy.sh` runs `compose run --rm migrate` explicitly. Never remove that.
- GitHub Actions: `workflow_run` cross-workflow triggers silently don't fire (deploy lives **inside** ci.yml with `needs: build`); multiline PEM secrets get flattened on paste (hence the **base64** key secret decoded on the runner).
- When verifying a deploy, don't trust the server's git HEAD — it flips at the *start* of deploy.sh. Check the docker image `Created` timestamp and grep the running container for new code. Queued deploys serialize via the concurrency group.
- The chat Redis Socket.IO adapter must be installed at **bootstrap** (`main.ts` → `RedisIoAdapter`) — a namespaced gateway's `afterInit` receives the Namespace, not the root server (this was broken in prod and is now fixed).

**Architecture rules that matter:**
- Money is an **immutable double-entry ledger** in integer minor units; deposits post `COMPANY_BANK→wallet` (manual) or `GATEWAY_CLEARING→wallet` (card, idempotent + atomic inside a transaction with a status-guarded `updateMany` claim). Never mutate ledger rows.
- Trip privacy: `receivingAddress` is revealed to the shopper **only after dual agreement** (`deals.service.serialize`); `tripDate` never leaves the API. Public mission/profile selects are deliberately minimal — keep them that way.
- Blocked users can still log in but are restricted to ongoing-deals-only surfaces (`AccountAccessGuard` global guard + `support/moderation.ts` allow-list). Blocking records **phone** identifiers only (by design — no EMAIL kind).
- Email/SMS/payment providers are **config-activated with dev-logger fallbacks** — the same build runs everywhere; activation is purely `.env`. OTP codes appear in api container logs while in dev mode (that's how the smoke test verified registration).
- All request validation lives in `packages/shared` Zod schemas via a custom `ZodValidationPipe`; i18n keys must exist in **both** `en.json` and `ar.json`.

**Working with the owner (aleimam / egyptvitaminsshare@gmail.com):** incremental increments — build one, verify (build + 131 tests + boot/health), commit with a detailed message, push (auto-deploys), then report and wait for "Please proceed". They value cost-consciousness (self-hosted MinIO over paid R2), being told the truth about risks (see `Issues.txt`), and concrete verification over claims. Git identity: `aleimam <aleimam@live.com>`.

**Supplementary (same machine only):** this Claude installation keeps project memory at `C:\Users\aleim\.claude\projects\C--Claude-Sindbad\memory\` — richer historical detail if present, but this handoff is self-sufficient without it.

## How to continue

Open a new session in this folder (`C:\Claude\Sindbad`) and say:
**"Read HANDOFF.md and continue this project."**
