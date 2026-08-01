# findmy-family

Family-scoped self-hosted app for Apple FindMy / Offline-Finding accessories.

The admin links one Apple ID for the whole household; members log in
with email + password and see only the accessories assigned to them on
an OpenStreetMap view. Designed to work with custom firmware like
[FindMy-TLSR8232](https://github.com/e-labInnovations/FindMy-TLSR8232)
as well as standard OpenHaystack/macless-haystack-compatible tags.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind 4**
- **Prisma** + **PostgreSQL** (bring your own running instance)
- **Auth.js v5** (email + password member auth)
- **Leaflet** + **OpenStreetMap** tiles
- **Anisette** (Docker) for Apple GSA fingerprint headers
- **Native Node port** of `pypush_gsa_icloud` (see `src/lib/apple/`)

## Setup

```bash
# 1. Install deps (uses pnpm@9)
npx --yes pnpm@9.15.0 install

# 2. Start anisette
docker compose up -d

# 3. Create a Postgres database, copy .env.example -> .env, fill in
#    - DATABASE_URL pointing at your DB
#    - MASTER_KEY (32 hex bytes; openssl rand -hex 32)
#    - AUTH_SECRET (32 hex bytes; openssl rand -hex 32)
cp .env.example .env

# 4. Apply schema
npx --yes pnpm@9.15.0 dlx prisma migrate dev --name init

# 5. Dev server
npx --yes pnpm@9.15.0 dev
```

## Layout

```
src/
  app/                  Next.js App Router pages
  lib/
    db.ts               Prisma client singleton
    crypto-at-rest.ts   AES-256-GCM for DB-stored secrets
    apple/
      anisette.ts       Anisette HTTP client
      gsa.ts            Apple GSA SRP login
      reports.ts        /acsnservice/fetch + decrypt
      crypto.ts         ECDH + AES-GCM report decryption
prisma/
  schema.prisma         users, accessories, acc_owners, apple_account, geocode_cache
docker-compose.yml      anisette service (postgres is bring-your-own)
```

## References

- [biemster/FindMy](https://github.com/biemster/FindMy) — Python original of GSA + decrypt
- [dchristl/macless-haystack](https://github.com/dchristl/macless-haystack) — production hardening reference
- [seemoo-lab/openhaystack](https://github.com/seemoo-lab/openhaystack) — the original research
- [Dadoum/anisette-v3-server](https://github.com/Dadoum/anisette-v3-server) — anisette container
