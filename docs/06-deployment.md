# 06 — Deployment Runbook

How to take Sindbad from an empty VPS to a live, TLS-secured production stack, and
how continuous deploys work afterwards. Single-box topology; everything runs under
one `docker compose` project.

> **Status:** LIVE in production (Hetzner CX33, Helsinki, 65.21.176.164) since
> 2026-07-10. HTTPS via Let's Encrypt, nightly DB backups, and CI/CD auto-deploy
> are active. Note: Traefik uses the **file provider** (`infra/traefik/dynamic/`),
> not the docker provider — Docker Engine 29 rejects Traefik's legacy socket API.

---

## 1. Topology

```
                       ┌─────────────── VPS (Ubuntu 24.04) ───────────────┐
   Internet ── 443 ──▶ │  Traefik  ─┬─▶ web    (Next standalone :3000)     │
   (Cloudflare)        │   (TLS)    ├─▶ admin  (Next standalone :3002)     │
                       │            └─▶ api    (NestJS :3001) ─┬─ postgres │
                       │                                       ├─ redis    │
                       │                                       └─ minio    │
                       └───────────────────────────────────────────────────┘
```

- **web** `sindbad.app` (+ `www`) · **admin** `admin.sindbad.app` · **api** `api.sindbad.app`
- `postgres`, `redis`, `minio` are on an **internal** network — never exposed publicly.
- All media is streamed **through the API**, so MinIO needs no public route.
- Redis backs the Socket.IO adapter (chat) and is ready for future horizontal scale.

---

## 2. Prerequisites

- VPS: **8 GB RAM / 4 vCPU / ≥ 80 GB SSD**, Ubuntu 24.04, root or sudo SSH access.
- A domain with DNS you control (Cloudflare recommended).
- The three hostnames above pointed at the VPS IP (A / AAAA records).

---

## 3. Provision & harden

```bash
# As root on the fresh box:
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh

# SSH: key-only, no root login. Edit /etc/ssh/sshd_config:
#   PasswordAuthentication no
#   PermitRootLogin no
systemctl restart ssh

# Firewall
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable

# Automatic security updates + fail2ban
apt update && apt install -y unattended-upgrades fail2ban
dpkg-reconfigure -plow unattended-upgrades

# Swap (protects 8 GB box during image builds)
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 4. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy   # log out/in so `docker` works without sudo
docker compose version      # verify the compose plugin is present
```

## 5. DNS & Cloudflare

1. Add A records for `sindbad.app`, `www`, `admin`, `api` → VPS IP.
2. **First cert issuance:** set the four records to **DNS-only (grey cloud)** so
   Let's Encrypt's HTTP-01 challenge reaches Traefik directly.
3. After the stack is up and certs are issued (step 7), switch to **Proxied
   (orange cloud)** and set SSL/TLS mode to **Full (strict)**.
   - Alternative: keep proxied throughout and use a **Cloudflare Origin Certificate**
     instead of Let's Encrypt (swap the Traefik cert resolver for a mounted cert).

## 6. Configure

```bash
sudo mkdir -p /opt/sindbad && sudo chown deploy:deploy /opt/sindbad
git clone https://github.com/aleimam/sindbad.git /opt/sindbad
cd /opt/sindbad
cp .env.production.example .env
# Fill in every CHANGE_ME. Generate secrets with: openssl rand -hex 32
nano .env
```

## 7. First deploy

```bash
cd /opt/sindbad
chmod +x scripts/deploy.sh
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Order of operations handled by compose:
1. `postgres` starts and becomes healthy.
2. `migrate` runs `prisma migrate deploy` then `node prisma/seed.mjs` (idempotent),
   then exits.
3. `api`, `web`, `admin` start; Traefik requests certs and begins routing.

Watch it come up:

```bash
docker compose -f docker-compose.prod.yml logs -f traefik migrate api
```

## 8. Verify

```bash
curl -fsS https://api.sindbad.app/api/health          # → { status: "ok", ... }
curl -fsS https://api.sindbad.app/api/docs-json | head # OpenAPI served
```

- `https://sindbad.app` loads (EN) and `https://sindbad.app/ar` is RTL.
- `https://admin.sindbad.app` → staff login; sign in with `SEED_ADMIN_EMAIL`
  and complete TOTP enrollment.
- **Runtime E2E** (do this once on staging before announcing):
  register → OTP verify → login → post a trip → approve it in admin →
  post a shipment → match → open a deal → fund escrow → advance → complete →
  leave a review → open a chat → raise a complaint → check the dashboard KPIs.

## 9. Continuous deploys (CI/CD)

`.github/workflows/deploy.yml` runs after **CI** passes on `main` (or via manual
dispatch) and SSHes in to run `scripts/deploy.sh` (git pull → rebuild → migrate → prune).

Add these **repository secrets** (Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | VPS IP / hostname |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | private key whose public half is in `deploy`'s `authorized_keys` |

## 10. Backups

```bash
# Nightly Postgres dump (crontab -e for the deploy user):
0 3 * * * docker exec sindbad-postgres-1 pg_dump -U sindbad sindbad | gzip > /opt/sindbad/backups/db-$(date +\%F).sql.gz
```

- MinIO data lives in the `minio_data` volume — snapshot it (or mirror to off-box
  storage with `mc mirror`) on the same cadence.
- Copy backups off the box (object storage / another host). Test a restore quarterly.

## 11. Operations

```bash
docker compose -f docker-compose.prod.yml ps                 # status
docker compose -f docker-compose.prod.yml logs -f api         # tail logs
docker compose -f docker-compose.prod.yml restart api         # restart one service
git reset --hard <previous-sha> && ./scripts/deploy.sh        # rollback to a known-good commit
```

- **Scaling the API** (later): add replicas behind Traefik. Socket.IO already has
  sticky sessions enabled and the Redis adapter fans broadcasts across replicas;
  presence tracking would then need to move to a Redis-backed set.

---

## 12. Pre-launch checklist (⚠ resurface with the owner)

These were deferred during the build and **must be decided before public launch**
(see `open-risk-flags.md`):

- [ ] **AML / fraud:** no identity verification is required before withdrawal — decide
      a KYC-before-payout threshold.
- [ ] **GDPR vs retention:** ledger/reviews are retained indefinitely; reconcile with
      a data-retention & erasure policy.
- [ ] **Email/SMS deliverability:** wire real providers (SMTP/SMS Misr/Twilio) and warm
      the sending domain (SPF/DKIM/DMARC) — dev providers only log codes.
- [ ] **Payment gateways:** add Kashier/OPay credentials to `.env` and enable the adapters.
- [ ] **Legal pages:** publish Terms, Privacy, etc. from the admin CMS (seeded unpublished).
- [ ] **iOS/PNG PWA icons:** rasterize PNG app icons on the Linux box (local Windows
      `sharp` binary is broken) for full iOS "Add to Home Screen" fidelity.
- [ ] **Backups verified:** confirm a dump restores cleanly before go-live.
