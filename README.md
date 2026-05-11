# SatellDex Demo

SatellDex — Solana Holder Intelligence. Single-page Next.js with wallet
adapter ed25519 sign gate, multi-token dashboard, and community vote gauge.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind 4
- @solana/wallet-adapter-react / -ui (mainnet RPC for read-only context, no real txs)

## Run

```bash
yarn install
yarn dev          # dev server on :3000
yarn build && yarn start
```

## What's included

- Sign gate: `satelldex-demo:view-tokens` ed25519 signature unlocks the dashboard.
- 6 demo tokens with synthetic snapshots + top 200 holders (only top 100 exposed).
- 3 distributions per token: Liquidity / Account / Tokens.
- Community gauge: 3 pending tokens that graduate at 10 signed votes.
  Each vote signs `satelldex-demo:vote:<slug>`. Persistence in localStorage.

## Data files

```
public/demo-data/
├── tokens.json              ← list of 6 demo tokens
├── snapshots/<slug>.json    ← per-token aggregated metrics
└── holders/<slug>.json      ← top 200 holders (UI shows top 100)
```
