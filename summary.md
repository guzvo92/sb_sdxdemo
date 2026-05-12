# summary.md — SatellDex Demo
# version: 1.6 (11-may-26 20:27)
# tokens: ~3400
# lineas: 325

> Concept proof of **on-chain Solana holder intelligence** with community-
> driven token tracking. Built for the Colosseum Solana Frontier Hackathon
> 2026.

---

## What this app does

SatellDex is a Solana holder analytics platform that lets the community
**signal which tokens deserve to be tracked**, and then exposes detailed
holder distribution for each tracked token.

The core loop:

```
1. User connects a Solana wallet.
2. User signs `satelldex-demo:view-tokens` to unlock the dashboard.
3. User sees tracked tokens with 3 distribution analyses.
4. User can vote (sign) for pending tokens — 10 votes graduates a token
   from "pending" to "tracked", at which point the scanner picks it up.
```

Every action that has consequences is **signed with the user's wallet
(ed25519 via wallet-adapter)**. No magic links, no email auth.

---

## Tracked tokens — 3 distribution analyses

For every tracked token, three independent distributions are computed:

```
Analysis             | What it shows                                  | Use case
---------------------|------------------------------------------------|------------------------
Liquidity            | % of supply by holder cluster:                  | Detect whale
Distribution         | Pool · Top 1–10 · 11–20 · 21–50 · 51–100        | concentration / pool
                     | · Others                                        | dominance.
                     |                                                |
Account              | Wallets bucketed by USD value, etiquetadas      | Distinguish bot dust
Distribution         | con marine tiers:                              | from real holders.
                     |   🐋 WHALE     +$50k                            | Las marine tiers
                     |   🦈 SHARK     $10k–50k                         | aparecen en /global
                     |   🐬 DOLPHIN   $5k–10k                          | como label de cada
                     |   🐟 FISH      $1k–5k                           | serie en los bar charts
                     |   🦀 CRAB      $500–1k                          | (counts y % share).
                     |   🦐 SHRIMP    $100–500                         |
                     |   🦠 PLANKTON  <$100                            |
                     |                                                |
Tokens               | Wallets bucketed by raw token amount,           | See whale tiers
Distribution         | log scale: +100M · 10M–100M · 5M–10M ·          | independent of price.
                     | 1M–5M · 100k–1M · 10k–100k · 1k–10k ·           |
                     | 100–1k                                          |
```

Holder list shows **top 100 wallets** per token with: rank, address
(truncated), token amount, and USD value.

---

## Community gauge (gamification)

Three "pending" tokens are visible to all signed-in users. Each can be
**voted up by signing a message**:

```
Vote message format: "satelldex-demo:vote:<slug>"

Wallet signs this message → vote counter increments by 1 (per device).

10 signed votes  →  token GRADUATES  →  badge changes to "✓ scanning"
                                        the token joins the tracked list
```

The flow is lightweight: it's a **community signal**, not
a governance vote.

---

## Tech stack

```
Layer    | Tech
---------|---------------------------------------------------------------
Front    | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4
Wallet   | @solana/wallet-adapter-react / -ui / -base / -wallets
Adapters | @solana/wallet-adapter-phantom · -solflare (desktop explicitos)
         | @solana-mobile/wallet-adapter-mobile (MWA · deeplink en mobile)
Charts   | Chart.js via CDN (sin npm dep), solo en /global
RPC      | NEXT_PUBLIC_SOLANA_RPC env (default: api.mainnet-beta.solana.com)
Data     | Static JSON files served from public/ (tokens, snapshots,
         | holders, global). No database.
Persist  | localStorage for vote counters. Auth no persiste — refresh = re-firmar.
Render   | 2 routes client-side ("use client"): / y /global. Root layout
         | es server component; AppWalletProvider aislado en componente
         | cliente bajo app/components/. No API.
```

---

## What's Solana-native

- Wallet connect with Phantom / Solflare / wallet-standard auto-detect.
- **Every state-changing action is wallet-signed** (sign gate, votes).
- The dashboard is gated behind an ed25519 signature — no account form,
  no email, no password.
- The token list, snapshots and holder data are served as static JSON
  from `public/demo-data/` with deterministic schemas.

---

## File layout

```
sb_satelldexdemo/
├── app/
│   ├── layout.tsx              ← server component · monta AppWalletProvider
│   ├── page.tsx                ← home (sign gate + tracked tokens + gauge)
│   ├── globals.css             ← Tailwind 4 + theme vars
│   ├── components/
│   │   └── AppWalletProvider.tsx  ← "use client" · ConnectionProvider +
│   │                                WalletProvider con Phantom/Solflare/MWA
│   └── global/                 ← Global VIP dashboard route
│       ├── page.tsx                  ← sign gate + 2 HUD tabs
│       ├── sec_yestmul_liqclust.tsx  ← bar chart: % liquidity clusters
│       ├── sec_yestmul_nwalls.tsx    ← bar chart: wallets by USD bucket (counts)
│       │                                + marine-tier labels (🐋🦈🐬🐟🦀🦐🦠)
│       ├── sec_yestmul_nwallsper.tsx ← bar chart: wallets by USD bucket (%)
│       │                                + marine-tier labels
│       ├── sec_token_nwallsclust.tsx ← line chart por token: evolucion
│       │                                temporal de brackets habilitados
│       │                                (+FISH, WHALE, SHARK, DOLPHIN,
│       │                                FISH, CRAB, SHRIMP)
│       └── chartjs.d.ts              ← window.Chart type declaration
├── public/
│   └── demo-data/
│       ├── tokens.json                  ← 6 tracked tokens metadata
│       ├── snapshots/<slug>.json        ← per-token aggregated metrics
│       ├── holders/<slug>.json          ← per-token top 200 holders
│       └── global/
│           ├── global_history.json      ← 1 snapshot per token (no time-series)
│           └── categories.json          ← AI Agents / Memecoins / Infrastructure
├── gen_global_dummy.py         ← generador de global_history.json (N_SNAPS=1)
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── README.md                   ← run instructions
└── summary.md                  ← this file
```

---

## How to run

```bash
yarn install
yarn dev                       # dev server at http://localhost:3000
yarn build && yarn start       # production build
```

El demo deploya a Vercel free tier sin configuracion adicional. Env vars:

```
Var                       | Default                              | Uso
--------------------------|--------------------------------------|--------------
NEXT_PUBLIC_SOLANA_RPC    | https://api.mainnet-beta.solana.com  | endpoint
                          |                                      | de ConnectionProvider
```

`.env.local` esta ignorado por git. Para swap a Helius / QuickNode /
Triton, sobreescribir la var y rebuildear (`yarn build` desde el host).

---

## Wallet provider — patron clonado de sb_satelldex

`app/components/AppWalletProvider.tsx` (client component) envuelve la
app con tres adapters explicitos:

```
Adapter                       | Por que explicito
------------------------------|------------------------------------------------
PhantomWalletAdapter          | Garantiza que autoConnect tenga adapter listo
                              | en el primer render. Sin esto, wallet-standard
                              | descubre Phantom tarde y el boton se queda en
                              | "CONNECT" tras recargar.
                              |
SolflareWalletAdapter         | Mismo motivo para Solflare.
                              |
SolanaMobileWalletAdapter     | Implementa MWA. Necesario para que el click
(con appIdentity SatellDex,   | en "Mobile Wallet Adapter" en el modal dispare
chain solana:mainnet,         | deeplink a Phantom mobile / Solflare mobile /
authorizationResultCache)     | Jupiter. Reusa autorizacion cacheada.
```

`autoConnect=true` reconecta silencioso al recargar si wallet-adapter
guarda walletName previo en localStorage. No dispara modal ni deeplink
en first-time visits.

El root `layout.tsx` se mantiene como **server component** (sin
`"use client"`); solo el provider es cliente. Las pages (`/`, `/global`)
declaran su propio `"use client"`.

---

## Rutas

```
Ruta        | Mensaje firmado                   | Contenido
------------|-----------------------------------|----------------------------------
/           | satelldex-demo:view-tokens        | Tracked Tokens + Community Gauge
/global     | satelldex-demo:view-global        | Global VIP Dashboard (2 HUD tabs)
/global #vote| satelldex-demo:vote:<slug>       | (firma del gauge en /)
```

Cada ruta tiene su propio sign gate ed25519 — no hay session compartida
(refresh = re-firmar, sin cookies ni localStorage).

---

## Global VIP Section (/global)

Vista multi-token simplificada. 3 HUD tabs:

```
Tab           | Contenido
--------------|----------------------------------------------------------
TOKENS        | Lista de los 6 tokens con su categoría (AI Agents,
              | Memecoins, Infrastructure) + holders count + bigpool %
              |
LAST SNAPSHOT | 3 bar charts comparativos multi-token del snapshot
              | único actual:
              |   1) Liquidity Clusters % (6 metrics per token)
              |   2) Wallets by USD bucket — counts (9 metrics)
              |      labels: 🐋 WHALE / 🦈 SHARK / 🐬 DOLPHIN /
              |              🐟 FISH / 🦀 CRAB / 🦐 SHRIMP /
              |              🦠 PLANKTON / 🐠 +FISH
              |   3) Wallets by USD bucket — % share (7 metrics)
              |      mismos marine-tier labels que (2)
              | Cada chart con selector de categoría (ALL / AI / Meme / Infra)
              |
CLUSTERS BY   | 1 line chart por token (6 charts en grid responsive,
TOKEN         | minmax(420px,1fr)). Cada chart muestra evolución temporal
              | de los brackets habilitados de Account Distribution:
              |   🐠 +FISH    +$100
              |   🐋 WHALE    +$50k
              |   🦈 SHARK    $10k–50k
              |   🐬 DOLPHIN  $5k–10k
              |   🐟 FISH     $1k–5k
              |   🦀 CRAB     $500–1k
              |   🦐 SHRIMP   $100–500
              | Brackets FULL y PLANKTON existen en BRACKET_META pero
              | quedan deshabilitados (enabled=false) para no aplastar
              | la escala con la masa de holders <$100 / total.
              | Como N_SNAPS=1 hoy, cada line chart muestra 1 punto;
              | la lógica admite N timestamps cuando se agreguen más
              | snaps al global_history.json.
```

---

## Admins — lista file-based

Source of truth en `public/demo-data/admins.json`. NO hay DB, NO hay backend
para gestionar admins — el archivo es la única fuente. Formato:

```json
{
  "admins": [
    { "pubkey": "<base58 32 bytes>", "label": "Owner", "added_on": "2026-05-10" }
  ]
}
```

Efecto en el demo: **badge "ADMIN" en el navbar** cuando la wallet conectada
está en la lista. Sirve como marcador visible de rol.

```
Componente            | Donde
----------------------|--------------------------------------------------
public/demo-data/     | Archivo source of truth, versionable, editable
  admins.json         | a mano. Cambios requieren rebuild del front
                      |
app/page.tsx Navbar   | fetch admins.json + comparar publicKey → badge
                      |
app/global/page.tsx   | mismo patrón, lee del mismo JSON
  Navbar              |
```

Para agregar/quitar un admin: editar `admins.json` directamente, después
rebuildear el container con el flujo estándar:

```bash
sudo rm -rf .next && yarn build && docker restart satelldexdemofront
```

---

## Browser flow (first-time user)

```
1. Land on /                                  ← hero with gradient title
2. "Connect Wallet" button                    ← WalletMultiButton modal
3. After connect: "Sign & View Tokens"        ← button signs ed25519 msg
4. After sign: dashboard loads                ← 6 token chips visible
5. Click any chip                             ← header + 3 distributions
                                              + top 100 holders
6. Scroll to Community Gauge                  ← 3 pending tokens with
                                              vote button each
7. Click "Sign Vote"                          ← wallet pops up to sign
8. Vote counter +1                            ← toast notification
9. Repeat 10 times                            ← token graduates,
                                              badge "✓ scanning" appears
```

---

## License & contact

Submitted to Colosseum Solana Frontier Hackathon · May 2026.
