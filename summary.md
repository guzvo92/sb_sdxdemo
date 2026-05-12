# summary.md — SatellDex Demo
# version: 2.1 (12-may-26 01:18)
# tokens: ~7900
# lineas: 657

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
│   ├── page.tsx                ← landing marketing (clonada de sb_satelldex)
│   ├── globals.css             ← Tailwind 4 + theme vars (--accent agregado)
│   ├── components/
│   │   └── AppWalletProvider.tsx  ← "use client" · ConnectionProvider +
│   │                                WalletProvider con Phantom/Solflare/MWA
│   ├── lib/
│   │   ├── verifySign.ts       ← verifyEd25519 + isAdmin file-based +
│   │   │                          parseTimestampedMsg (compartido por
│   │   │                          /api/community_request y /api/regenerate)
│   │   ├── scraper.ts          ← DexScreener client: fetchDexScreenerToken +
│   │   │                          fetchAllTargets (concurrencia 5)
│   │   └── helius.ts           ← Helius DAS client: fetchTokenAsset +
│   │                              fetchTokenHolders paginado +
│   │                              enrichHolders + buildSnapshotRich
│   ├── layout/
│   │   └── navbarhome.tsx      ← navbar fijo de la landing · drawer mobile
│   │                              custom (sin Bootstrap) · admin badge via
│   │                              admins.json · boton REGEN (admin only)
│   ├── home/                   ← componentes del hero (clonados del prod)
│   │   ├── a11animator.tsx     ← Comp_TextAnimation (terminal estilo retro)
│   │   ├── a11animator.css     ← estilos del animator + responsive hero
│   │   ├── comp_metricsroller.tsx ← roller infinito · computa metrics desde
│   │   │                            tokens.json + global_history.json local
│   │   ├── comp_tokenselector.tsx ← Comp_TokenSelector + VipCard +
│   │   │                            VipInterestButton · lee categories.json
│   │   │                            y global_history.json
│   │   ├── sec1_hero.tsx       ← hero completo (terminal + headline + roller
│   │   │                          + VipCard + tokens/community + Vip tester)
│   │   ├── sec2_statsbar.tsx   ← tech stack stats (Meteora, Raydium, ...)
│   │   ├── sec3_hexnode.tsx    ← node card con scan line · imagen
│   │   │                          /assets/Node.png
│   │   ├── sec4_pillars.tsx    ← HOLDER SCAN / LIQMAP / TIME SERIES
│   │   ├── sec5_plans.tsx      ← cards FREE (→ /tracked) + ALPHA (→ /global)
│   │   └── sec6_communityreq.tsx ← tabla de requests · fetch
│   │                              /api/community_request
│   ├── tracked/
│   │   └── page.tsx            ← dashboard previo del demo (sign gate +
│   │                              tracked tokens + community gauge)
│   ├── requiretoken/
│   │   └── page.tsx            ← form CRUD: firma + POST a
│   │                              /api/community_request
│   ├── api/
│   │   ├── community_request/
│   │   │   └── route.ts        ← GET (lista) + POST (append, valida
│   │   │                          ed25519 + anti-replay 300s)
│   │   └── regenerate/
│   │       └── route.ts        ← GET (ultimo scrape) + POST (admin only:
│   │                              valida firma + dispara DexScreener +
│   │                              escribe dexscraptokens.json)
│   └── global/                 ← Global VIP dashboard route
│       ├── page.tsx                  ← sign gate + 3 HUD tabs
│       ├── sec_yestmul_liqclust.tsx  ← bar chart: % liquidity clusters
│       ├── sec_yestmul_nwalls.tsx    ← bar chart: wallets by USD bucket (counts)
│       │                                + marine-tier labels (🐋🦈🐬🐟🦀🦐🦠)
│       ├── sec_yestmul_nwallsper.tsx ← bar chart: wallets by USD bucket (%)
│       │                                + marine-tier labels
│       ├── sec_token_nwallsclust.tsx ← line chart por token: evolucion
│       │                                temporal de brackets habilitados
│       └── chartjs.d.ts              ← window.Chart type declaration
├── public/
│   ├── admins.json             ← lista de pubkeys admin (root, fetch /admins.json)
│   ├── targets.json            ← lista de CAs editable a mano (input REGEN)
│   ├── assets/
│   │   └── Node.png            ← imagen del nodo en /sec3_hexnode
│   ├── home/
│   │   ├── cmd.png             ← background del terminal animator desktop
│   │   ├── cmdsmall.png        ← background del animator mobile
│   │   └── cmdsmall2.png       ← alias usado por a11animator.css
│   └── demo-data/
│       ├── tokens.json                  ← 6 tracked tokens metadata (legacy)
│       ├── snapshots/<slug>.json        ← per-token aggregated metrics (dummy)
│       ├── holders/<slug>.json          ← per-token top 200 holders (dummy)
│       ├── community_requests.json      ← source of truth del CRUD
│       ├── dexscraptokens.json          ← output del scrape DexScreener (REGEN)
│       └── global/
│           ├── global_history.json      ← 1 snapshot per token (no time-series)
│           └── categories.json          ← AI Agents / Memecoins / Infrastructure
├── makesnap.ts                 ← script standalone Helius (top 100 holders +
│                                 snapshot rico por CA). Disparado por
│                                 /api/regenerate F2 via child_process.spawn,
│                                 o manual: npx tsx makesnap.ts
├── gen_global_dummy.py         ← generador de global_history.json (N_SNAPS=1)
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── README.md                   ← run instructions + snapshot pipeline
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
Ruta                     | Mensaje firmado                              | Contenido
-------------------------|----------------------------------------------|----------------------------------
/                        | (sin firma)                                  | Landing marketing (hero, plans, ...)
/tracked                 | satelldex-demo:view-tokens                   | Tracked Tokens + Community Gauge
/tracked #vote           | satelldex-demo:vote:<slug>                   | gauge gamificado (firma por voto)
/global                  | satelldex-demo:view-global                   | Global VIP Dashboard (3 HUD tabs)
/requiretoken            | satelldex-demo:require-token:<ts>:<addr>     | Form CRUD para community requests
/api/community_request   | (GET) sin firma · (POST) requiere firma      | Lista + append de community requests
/api/regenerate          | (GET) sin firma · (POST) requiere admin      | GET ultimo scrape · POST dispara
                         |     satelldex-demo:regenerate:<ts>           |     fire-and-forget makesnap.ts
                         |                                              |     y devuelve {started_at,
                         |                                              |     targets_count, progress_url}
/api/snap_progress       | sin firma · lectura publica                  | Estado actual del snapshot en
                         |                                              |     curso (poleado cada 1s por
                         |                                              |     el navbar)
/hackathonview           | (pendiente Fase 2 — no clonado todavia)      | 404 hoy · clone planeado
/globalhackathon         | (pendiente Fase 2 — no clonado todavia)      | 404 hoy · clone planeado
```

Las rutas con sign gate (/tracked, /global) re-piden firma en cada refresh
(sin cookies ni localStorage). La landing / y el form /requiretoken son
publicos; el POST de /api/community_request valida ed25519 + anti-replay
de 300s.

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
sudo rm -rf .next && yarn build && docker restart satelldexdemo
```

---

## Home landing (/)

Clonada de `sb_satelldex/front/app/page.tsx`. Sin sign gate. Composicion:

```
Seccion           | Contenido
------------------|-------------------------------------------------------------
banner hackathon  | CTA a /hackathonview y /globalhackathon para jueces del
                  | Solana Frontier Hackathon 2026.
                  |
SecHero           | Terminal animado (Comp_TextAnimation) + headline gradient
                  | + Comp_MetricsRoller (computa metrics desde JSONs locales)
                  | + VipCard (link /tracked) + Comp_TokenSelector (lee
                  | categories.json + global_history.json) + SecCommunityReq
                  | (lee /api/community_request) + VipInterestButton (demo
                  | only, sin POST).
                  |
SecStatsbar       | Tech stack hardcoded: Meteora, Raydium, Solscan, QuickNode.
                  |
SecHexnode        | Card del nodo con imagen /assets/Node.png, scan line
                  | animada, esquinas cyberpunk, badge "NODE / ACTIVE".
                  |
SecPillars        | HOLDER SCAN, LIQMAP, TIME SERIES (3 cards "How it works").
                  |
SecPlans          | FREE (-> /tracked) + ALPHA (-> /global). Sin /demovip,
                  | /freetoken ni /payment (esas rutas no existen en demo).
```

### Adaptaciones vs prod

```
Componente del prod          | Adaptacion en demo
-----------------------------|-----------------------------------------------
SDK Sdkrout_back             | Fetch directo a JSONs estaticos en /demo-data/
                             |
TokenSelector                | Lee categories.json + global_history.json
                             | (no /api/category_list ni /api/globalrun_history).
                             |
MetricsRoller                | No usa /api/db_metrics_summary: computa
                             | ntokens/nsnapshots/nwallets/npools/ndays
                             | desde tokens.json + global_history.json local.
                             |
VipInterestButton            | Sin POST a /api/vipinterest_submit (no hay
                             | backend para registrar interes). Solo
                             | conecta wallet y muestra "demo only".
                             |
SecCommunityReq              | Fetch a Next.js Route Handler
                             | /api/community_request (file-based).
                             |
Navbarx_home                 | Sin /api/wallet_status (admin solo via
                             | admins.json). Mobile drawer custom (state
                             | React) en lugar de Bootstrap offcanvas.
                             | Items reducidos: WHAT IS, DASHBOARD, GLOBAL,
                             | HACKATHON.
```

---

## Community requests CRUD

Endpoint Next.js + JSON file-based + form firmado. Sin DB, sin backend extra.

```
Componente                              | Funcion
----------------------------------------|----------------------------------------
public/demo-data/community_requests.json| Source of truth · array de requests
                                        | con votes, submitted_by (pubkey),
                                        | message, signature_b64.
                                        |
app/api/community_request/route.ts      | GET: lista ordenada por votes desc.
                                        | POST: valida ed25519 (tweetnacl +
                                        | bs58), anti-replay 300s, mensaje
                                        | canonico
                                        | "satelldex-demo:require-token:<ts>:<ca>".
                                        | Si el CA ya existe: incrementa
                                        | votes (vota), si no: appende fila
                                        | nueva.
                                        |
app/requiretoken/page.tsx               | Form: token_address (CA · required),
                                        | symbol, name, price_usd, fdv_mc,
                                        | npools. Firma + POST + estado UI.
                                        |
app/home/sec6_communityreq.tsx          | Tabla en el hero: GET listado,
                                        | render top 8, CTA -> /requiretoken
                                        | si hay wallet conectada.
```

Errores del endpoint POST: `bad_payload`, `missing_*`, `invalid_token_address`,
`bad_message_format`, `bad_timestamp`, `replay`, `token_mismatch`,
`invalid_signature`.

---

## Snapshot pipeline / botón REGEN

Trigger único: botón **↻ REGEN** en el navbar (admin-only). El endpoint
hace **fire-and-forget**: spawn de `makesnap.ts` en background y devuelve
inmediato. El front polea `/api/snap_progress` cada 1s para mostrar vista
progresiva del avance (panel flotante en bottom-right).

```
makesnap.ts (orquesta TODO secuencial, por token)
  F1 DexScreener  -> metadata price/fdv/liquidity/volume
                     persiste al final: public/demo-data/dexscraptokens.json
  F2 Helius DAS   -> getAsset (decimals/supply/price/symbol/name)
                     getTokenAccounts paginado (hasta MAX_PAGES=20,
                     1000 accounts/pag), agrupado por owner
                     top 100 enriquecido -> holders/<slug>.json
                     bucketize -> snapshots/<slug>.json
  Tiempo:  ~5-15s por token grande (depende de #pages)
           ~40-90s total para 8 tokens (secuencial)
  Requiere: HELIUS_API_KEY en .env.local (Next la carga, spawn la hereda)
  Falla con missing_helius_key si la env no esta seteada
```

### Flujo end-to-end

```
1. Front (boton REGEN, admin) POST /api/regenerate
   { pubkey, message:"satelldex-demo:regenerate:<ts>", signature_b64 }
   ↓
2. Endpoint valida (firma ed25519 + admin + anti-replay 300s)
   + cuenta CAs validos en public/targets.json
   ↓
3. Endpoint escribe snap_progress.json inicial { status:"starting", ... }
   ↓
4. Endpoint spawn detached "npx tsx makesnap.ts" (unref) y devuelve
   inmediato 200 { ok:true, started_at, targets_count, progress_url,
   poll_interval:1000 }
   ↓
5. Front pasa a estado "running" y empieza polling cada 1s a
   GET /api/snap_progress (sin auth)
   ↓
6. makesnap.ts ejecuta por cada token, escribiendo snap_progress.json
   antes de cada paso:
   - phase:"dexscreener" / step:"[F1] dexscreener · popcat"
   - phase:"helius" / step:"[F2] helius getAsset · popcat"
   - phase:"helius" / step:"[F2] popcat · page 3 · 2847 accts"
   - phase:"writing" / step:"[F2] writing popcat"
   - completed.push({slug, ok, elapsed_ms, holders_count, symbol})
   ↓
7. Front renderiza el panel flotante con:
   - status (running/done/error) + elapsed_ms en header
   - current_idx/current_total + current_token + phase + current_step
   - barra de progreso por completados.length / current_total
   - lista de completados con ✓/× + slug(symbol) + holders + elapsed
   ↓
8. makesnap.ts escribe snap_progress.json final { status:"done", result }
   ↓
9. Front detecta status=done en el polling, muestra resumen final y
   limpia el panel a los 8s.
```

### Inputs / outputs

```
Archivo                                  | Rol
-----------------------------------------|------------------------------------
public/targets.json                      | INPUT editable. {targets:[{slug,ca}]}
                                         |   ca con PASTE_ o length<32 se ignora.
                                         |   Hoy: 8 memes importados de la DB
                                         |   del prod sb_satelldex (buck,
                                         |   fartcoin, giga, popcat, retardio,
                                         |   weed, usduc, hanta).
                                         |
public/admins.json                       | INPUT. Source of truth pubkeys admin.
                                         |   El boton REGEN solo aparece si la
                                         |   wallet conectada esta en la lista.
                                         |
public/demo-data/dexscraptokens.json     | OUTPUT F1. {ok, scraped_at, source,
                                         |   tokens:[{ca, symbol, name,
                                         |   price_usd, fdv, marketcap,
                                         |   liquidity_usd, volume_24h, npools,
                                         |   raw_pairs}]}
                                         |
public/demo-data/holders/<slug>.json     | OUTPUT F2. Top 100 enriquecidos:
                                         |   {owner, amount,
                                         |    percentage_of_total_supply,
                                         |    value_today, has_mainpool,
                                         |    lookas_mainpool}
                                         |
public/demo-data/snapshots/<slug>.json   | OUTPUT F2. Snapshot rico flat:
                                         |   ca, runts, when, an_perc_top10/
                                         |   20/50/100, an_perc_bigpool, liq_*,
                                         |   acc_* (buckets USD), tok_*
                                         |   (buckets token amount),
                                         |   nholders_full/over100/under100.
```

### Componentes

```
app/lib/scraper.ts          fetchDexScreenerToken(ca) + fetchAllTargets(cas[])
                            usado por F1 (inline en el endpoint).
                            DexScreener no requiere API key.

app/lib/helius.ts           fetchTokenAsset(apiKey, mint) -> decimals/supply/
                            price/symbol/name via getAsset.
                            fetchTokenHolders(apiKey, mint, decimals,
                              onProgress?) -> agrupado por owner, paginado
                              hasta 20 paginas de 1000.
                            enrichHolders(raw, supply, price) -> shape rico.
                            buildSnapshotRich(holders, asset) -> snapshot flat.

app/lib/verifySign.ts       verifyEd25519 + isAdmin (lee public/admins.json) +
                            parseTimestampedMsg. Compartido con
                            /api/community_request.

makesnap.ts (root)          F2 standalone. IIFE async + parser de flags
                            (--targets, --out, --top, --dry-run). Por cada CA:
                            getAsset + getTokenAccounts paginado + enrich +
                            bucketize + writeFile. Imprime progreso por
                            t+<segundos>s. Output final: linea
                            "MAKESNAP_RESULT {json}" en stdout.

app/api/regenerate/route.ts POST: valida bad_json / missing_fields /
                            bad_message_format / replay (+/-300s) /
                            invalid_signature / not_admin /
                            targets_unreadable / no_valid_targets /
                            dex_scrape_failed (F1) / write_failed (F1).
                            Tras F1 ok, spawn-ea ./node_modules/.bin/tsx
                            makesnap.ts. Parsea MAKESNAP_RESULT del stdout o
                            MAKESNAP_ERROR del stderr. Si tsx no esta
                            (node_modules sin tsx), devuelve spawn_failed.
                            Mensaje canonico:
                            "satelldex-demo:regenerate:<unix_ts>".
                            200 -> { ok, took_ms, f1:{...}, f2:{...} }.
                            GET: devuelve dexscraptokens.json sin auth.

app/layout/navbarhome.tsx   Boton "↻ REGEN" (admin only). Estados
                            idle/signing/running/done/error. Toast flotante
                            con resultado. Tambien en drawer mobile.
```

### Env var

```
HELIUS_API_KEY              Requerido por F2. Sin la key, makesnap.ts aborta
                            con "missing_helius_key" antes de procesar
                            ningun CA. F1 (DexScreener) sigue funcionando.
                            Se carga desde .env.local (gitignored) o via
                            docker run -e HELIUS_API_KEY=... al recrear el
                            container.
```

### Ejecuciones manuales

```bash
# desde el container (recomendado, mismo env y filesystem)
docker exec satelldexdemo npx tsx makesnap.ts

# dry-run (no escribe nada, solo loguea)
docker exec satelldexdemo npx tsx makesnap.ts --dry-run

# top N distinto (default 100)
docker exec satelldexdemo npx tsx makesnap.ts --top 50

# desde el host
cd /home/gman/asdb/dockersprod/sb_satelldexdemo
npx tsx makesnap.ts
```

---

## Browser flow (first-time user)

```
1. Land on /                                  ← landing marketing
2. Banner judges → /hackathonview             ← (Fase 2 pendiente)
3. "OPEN DEMO ↗" del plan FREE                ← /tracked
4. Sign "satelldex-demo:view-tokens"          ← dashboard de tokens unlock
5. Click any token chip                       ← 3 distributions + top 100
6. Community Gauge (3 pending tokens)         ← vote +1 firmando cada vez
7. Repeat 10 votos / token                    ← token graduates → "✓ scanning"
8. Click "REQUEST A TOKEN →" en SecCommunityReq → /requiretoken
9. Llenar form y firmar                       ← POST a /api/community_request
10. Refresh / → request aparece en la tabla   ← votes desc, persiste en JSON
```

---

## License & contact

Submitted to Colosseum Solana Frontier Hackathon · May 2026.
