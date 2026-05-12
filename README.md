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

## Routes

```
  Path               | Purpose
  -------------------|--------------------------------------------
  /                  | Marketing landing
  /hackathonview     | Per-token dashboard (judge view)
  /globalhackathon   | Multi-token dashboard (judge view)
  /requiretoken      | Form to request a new token
```

## Refreshing the data

Admin wallets (listed in `public/admins.json`) see a **↻ REGEN** button
in the navbar. Clicking it signs a message and triggers two phases:

1. **DexScreener** — fetches price, liquidity and pools for each token.
2. **Helius DAS** — fetches the top 100 holders and computes the
   distribution buckets.

The output lands in `public/demo-data/` and the front end picks up the
latest folder automatically. The list of tracked tokens lives in
`public/targets.json` and is edited by hand.

`HELIUS_API_KEY` must be set in `.env.local` for phase 2 to run.

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
