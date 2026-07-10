# syntax=docker/dockerfile:1
# ── Sindbad API (NestJS + Prisma) — build from the monorepo root as context. ──
#   docker build -f apps/api/Dockerfile -t sindbad-api .

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
# Prisma + @node-rs/argon2 need OpenSSL 3 at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# ── deps: restore install layer keyed on manifests (maximises cache hits) ──
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/ui/package.json ./packages/ui/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ── build: compile the API and its workspace deps, then emit a prod bundle ──
FROM deps AS build
COPY . .
RUN pnpm --filter @sindbad/api... build
# Produce a flattened, prod-only node_modules (Linux native binaries) via pnpm deploy,
# then assemble /app deterministically — dist/prisma are copied from source so we
# never depend on pnpm-deploy's file-inclusion (pack) semantics.
RUN pnpm --filter=@sindbad/api deploy --prod /deploy
RUN mkdir -p /app \
  && cp -a /deploy/node_modules /app/node_modules \
  && cp -a apps/api/dist /app/dist \
  && cp -a apps/api/prisma /app/prisma \
  && cp apps/api/package.json /app/package.json
# Regenerate the Prisma client + engine into the assembled node_modules.
WORKDIR /app
RUN ./node_modules/.bin/prisma generate

# ── runtime: minimal image, non-root ──
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
RUN groupadd -r sindbad && useradd -r -g sindbad sindbad && chown -R sindbad:sindbad /app
USER sindbad
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
# Migrations run as a separate one-shot service (see docker-compose.prod.yml).
CMD ["node", "dist/main.js"]
