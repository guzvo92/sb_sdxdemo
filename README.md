# SatellDex Demo

A Next.js demo of **Solana Holder Intelligence**: a marketing landing
page, a per-token dashboard, a global multi-token view, a community
request form, and an admin button that refreshes the on-chain data.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4
- `@solana/wallet-adapter-react` for wallet connect (read-only RPC)
- `tweetnacl` + `bs58` for ed25519 signature verification

## Run

```bash
yarn install
yarn dev                       # http://localhost:3000
yarn build && yarn start       # production
```

## Required configuration files

Two JSON files under `public/` must be filled in by hand before the
demo is useful:

- **`public/admins.json`** — list of Solana pubkeys allowed to trigger
  REGEN. Without at least one entry, no wallet will see the ↻ REGEN
  button and the data can never be refreshed.

  ```json
  {
    "admins": [
      { "pubkey": "<base58 32 bytes>",
        "label":  "Owner",
        "added_on": "YYYY-MM-DD" }
    ]
  }
  ```

- **`public/targets.json`** — list of Solana mint addresses to scrape.
  Without entries, REGEN has nothing to fetch and the dashboards stay
  empty.

  ```json
  {
    "ok": true,
    "targets": [
      { "slug": "memetoken1", "ca": "<base58 mainnet mint>" },
      { "slug": "memetoken2", "ca": "<base58 mainnet mint>" }
    ]
  }
  ```

Both files must be present on disk before running the app.

## Routes

```
  Path               | Purpose
  -------------------|--------------------------------------------
  /                  | Marketing landing
  /hackathonview     | Per-token dashboard (judge view)
  /globalhackathon   | Multi-token dashboard (judge view)
  /requiretoken      | Form to request a new token
```

## Refreshing the data (snapshots)

The dataset is a set of static JSON files under `public/demo-data/`.
To refresh them, an **admin** triggers a new snapshot. One click = one
snapshot.

**Admin-only.** The **↻ REGEN** button is rendered only when the
connected wallet appears in `public/admins.json`. The
`/api/regenerate` endpoint also validates the ed25519 signature
server-side and rejects any non-admin pubkey, so the action is gated
both in the UI and at the API layer.

Clicking the button signs a message and runs two phases:

1. **DexScreener** — fetches price, liquidity and pools for each token.
2. **Helius DAS** — fetches the top 100 holders and computes the
   distribution buckets.

The output lands in `public/demo-data/<type>/<YYYY_MM_DD__HH_MM>/` and
the front end picks up the latest folder automatically. The list of
tracked tokens lives in `public/targets.json` and is edited by hand.

`HELIUS_API_KEY` must be set in `.env.local` for phase 2 to run.

## Roadmap — production design

The current demo uses static JSON files and a single container for
simplicity. The production architecture is being designed along two
parallel tracks:

- **MySQL migration** — the JSON files under `public/demo-data/`
  (snapshots, holders, dexscraptokens, community requests) will be
  replaced by a MySQL schema. The REGEN pipeline will write rows
  instead of files, and the front end will read through an API layer
  instead of fetching static assets.
- **Container split by responsibility** — the monolithic
  `satelldexdemo` container will be decomposed into three services:
  one for snapshot scraping (DexScreener + Helius), one for database
  writes, and one for the Next.js front end. Communication between
  them happens over an internal network.

These are design intents for production. The hackathon demo runs on
the simpler single-container, file-based setup.

## Docker

Container name: `satelldexdemo` (Next.js 16 on `node:20-alpine`),
served at `127.0.0.1:4950`. To apply front-end changes:

```bash
sudo rm -rf .next && yarn build
docker restart satelldexdemo
```

## Environment variables

```
  Variable                  | Default                              | Purpose
  --------------------------|--------------------------------------|---------------------
  NEXT_PUBLIC_SOLANA_RPC    | https://api.mainnet-beta.solana.com  | Wallet RPC endpoint
  HELIUS_API_KEY            | (unset)                              | Required by REGEN
```

`.env.local` is gitignored.
