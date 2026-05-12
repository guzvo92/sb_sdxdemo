# SatellDex Demo

SatellDex — Solana Holder Intelligence. Next.js demo con landing marketing,
dashboard de tracked tokens, vista global multi-token, CRUD de community
requests y botón REGEN para scrapear DexScreener on-demand.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind 4
- @solana/wallet-adapter-react / -ui (mainnet RPC for read-only context, no real txs)
- tweetnacl + bs58 (verificación ed25519 server-side)

## Run

```bash
yarn install
yarn dev                       # dev server on :3000
yarn build && yarn start       # production build
```

## Rutas

```
/                      landing marketing (hero + plans + pillars)
/tracked               dashboard de tracked tokens (sign gate)
/global                global VIP dashboard (sign gate, 3 HUD tabs)
/requiretoken          form CRUD: pedir un nuevo token
/api/community_request GET (lista) / POST (append firma admin/usuario)
/api/regenerate        GET (último scrape) / POST (dispara scrape, admin)
```

## Snapshot pipeline (REGEN)

El demo expone un botón **↻ REGEN** en el navbar (visible solo cuando la
wallet conectada está en `public/admins.json`) que dispara **dos fases**:

```
F1 — DexScreener inline (dentro del endpoint)
     metadata price/fdv/liquidity/volume por CA
     → public/demo-data/dexscraptokens.json
     ~5s para 8 tokens

F2 — Helius DAS subprocess (spawn npx tsx makesnap.ts)
     getAsset + getTokenAccounts paginado, top 100 holders enriquecidos
     → public/demo-data/holders/<slug>.json
     → public/demo-data/snapshots/<slug>.json (shape rico)
     ~40-90s para 8 tokens (secuencial)
     Requiere HELIUS_API_KEY en .env.local
```

Es la forma de actualizar los datos sin tocar el filesystem a mano.

### Source of truth de los CAs

```
public/targets.json
```

Lista editable a mano. Formato mínimo:

```json
{
  "ok": true,
  "targets": [
    { "slug": "memetoken1", "ca": "<base58 mint mainnet>" },
    { "slug": "memetoken2", "ca": "<base58 mint mainnet>" }
  ]
}
```

Los `slug` son internos al demo (sirven para nombrar archivos / chips). El
`ca` es el mint address real de Solana mainnet. Mientras un `ca` empiece
con `PASTE_` o tenga menos de 32 chars, el endpoint REGEN lo ignora.

### Cómo se dispara

```
Modo 1 — UI:
  navbar (admin) → click "↻ REGEN" → wallet pide firmar
  "satelldex-demo:regenerate:<unix_ts>" → POST /api/regenerate

Modo 2 — curl:
  ts=$(date +%s)
  msg="satelldex-demo:regenerate:$ts"
  # (firma offline con tu wallet · pubkey_b58 + signature_b64)
  curl -X POST http://localhost:4950/api/regenerate \
    -H 'Content-Type: application/json' \
    -d "{
      \"pubkey\": \"<pubkey base58>\",
      \"message\": \"$msg\",
      \"signature_b64\": \"<signature base64>\"
    }"
```

El server valida en orden:

```
Step                              | Falla con
----------------------------------|------------------------
JSON parse                        | bad_json
campos pubkey/msg/sig             | missing_fields
prefijo + timestamp               | bad_message_format
abs(now - ts) > 300s              | replay
ed25519 verify                    | invalid_signature
pubkey ∈ admins.json              | not_admin
targets.json legible              | targets_unreadable
CAs no placeholder                | no_valid_targets
F1: fetch DexScreener             | dex_scrape_failed
F1: fs writeFile                  | write_failed
F2: spawn tsx makesnap.ts         | spawn_failed | makesnap_exit_<code>
F2: HELIUS_API_KEY missing        | missing_helius_key (en payload.f2)
F2: getAsset / getTokenAccounts   | helius_http_<code> (en payload.f2)
```

La respuesta separa F1 y F2:

```json
{
  "ok": true,
  "took_ms": 45000,
  "f1": {"ok":true, "source":"dexscreener", "scraped":8, "elapsed_ms":5200,
         "written":"public/demo-data/dexscraptokens.json"},
  "f2": {"ok":true, "tokens":[...], "summary":{"processed":8,"ok":8,"fail":0},
         "elapsed_ms":40000}
}
```

Si F2 falla (ej. missing_helius_key), el campo `f2.ok=false` pero la
respuesta global sigue siendo 200 OK porque F1 sí completó.

### Qué escribe (layout limpio por fecha)

Cada output vive en una carpeta `YYYY_MM_DD/` con **un solo archivo por
slug, sin sufijo**. Cada run del mismo día sobreescribe el archivo del
slug. El front auto-detecta el folder más reciente vía `/api/snap_index`.

```
public/demo-data/
├── snapshots/<YYYY_MM_DD>/<slug>.json
├── holders/<YYYY_MM_DD>/<slug>.json
└── dexscraptokens/<YYYY_MM_DD>/all.json
```

No hay `<slug>.json` sueltos en `snapshots/` o `holders/`, ni
`dexscraptokens.json` suelto. Si querés time-series intra-día, hay que
cambiar la lógica (hoy cada run del día sobreescribe).

### Auto-detección del folder más reciente

```bash
curl http://127.0.0.1:4950/api/snap_index
```

Respuesta:

```json
{
  "ok": true,
  "snapshots":      { "folders": ["2026_05_12"], "latest": "2026_05_12" },
  "holders":        { "folders": ["2026_05_12"], "latest": "2026_05_12" },
  "dexscraptokens": { "folders": ["2026_05_12"], "latest": "2026_05_12" }
}
```

El front de `/tracked` y de `Comp_TokenSelector` consultan este endpoint
y construyen los paths de fetch contra `<latest>/<slug>.json`.

#### F1 — dexscraptokens.json shape:

```json
{
  "ok": true,
  "scraped_at": "ISO timestamp",
  "scraped_at_ts": 1715000000,
  "scraped_by": "<pubkey base58>",
  "source": "dexscreener",
  "count": 6,
  "tokens": [
    {
      "ca": "...",
      "symbol": "BONK",
      "name": "Bonk",
      "price_usd": 0.00001234,
      "fdv": 250000000,
      "marketcap": 200000000,
      "liquidity_usd": 12345000,
      "volume_24h": 6543000,
      "npools": 18,
      "chain_id": "solana",
      "dex_id": "raydium",
      "pair_address": "...",
      "price_change_24h": 5.4,
      "scraped_at": "ISO",
      "raw_pairs": [/* pairs originales DexScreener para auditoria */]
    }
  ]
}
```

`raw_pairs` se conserva entero por si en el futuro hay que extraer más
campos sin re-scrapear.

#### F2 — holders/<slug>.json shape:

```json
[
  {
    "owner": "<pubkey base58>",
    "amount": 12345678.9,
    "percentage_of_total_supply": 1.234,
    "value_today": 567.89,
    "has_mainpool": false,
    "lookas_mainpool": false
  }
]
```

#### F2 — snapshots/<slug>.json shape (flat):

```
ca, runts, when                               identificadores
an_perc_top10/20/50/100, an_perc_bigpool      compat sec_datatext_hackathon
liq_bigpool, liq_top1_10, liq_top11_20,       compat /tracked DistCards
  liq_top21_50, liq_top51_100, liq_others
acc_over50000 / 10000to50000 / 5000to10000 /  buckets USD
  1000to5000 / 500to1000 / 100to500 / under100
tok_over100M / 10Mto100M / 5Mto10M / 1Mto5M / buckets token amount
  100kto1M / 10kto100k / 1kto10k / 100to1k
nholders_full / nholders_over100 /            totales
  nholders_under100
```

### Ejecución manual de makesnap.ts

Sin pasar por el endpoint (útil para debugging, batch nocturno o cuando
querés ver la salida estructurada del script en consola).

**Flags soportados** (todos opcionales):

```
--targets <path>   path al targets.json
                   default: <cwd>/public/targets.json
--out <dir>        directorio raiz donde escribir holders/ y snapshots/
                   default: <cwd>/public/demo-data
--top <N>          cuantos holders enriquecer por token (default 100)
--dry-run          no escribe nada, solo loguea las fases y conteos
```

`HELIUS_API_KEY` es **obligatoria** vía env. Sin ella el script aborta con
`missing_helius_key`. Dentro del container la lee de `.env.local` (Next la
inyecta al proceso parent y `spawn` la hereda); fuera del container hay
que exportarla o pasarla inline.

#### Desde el host (fuera del container) apuntando a los targets

```bash
cd /home/gman/asdb/dockersprod/sb_satelldexdemo

# Opcion A: exportar y correr (heredada para el resto de la sesion)
export HELIUS_API_KEY="hl_xxxxxxxx"
npx tsx makesnap.ts \
  --targets public/targets.json \
  --out public/demo-data

# Opcion B: inline (no contamina la shell)
HELIUS_API_KEY="hl_xxxxxxxx" \
npx tsx makesnap.ts \
  --targets public/targets.json \
  --out public/demo-data

# Opcion C: leyendo la key directo de .env.local (sin export)
HELIUS_API_KEY=$(grep ^HELIUS_API_KEY= .env.local | cut -d= -f2-) \
npx tsx makesnap.ts \
  --targets public/targets.json \
  --out public/demo-data

# Opcion D: dry-run para verificar el targets sin tocar disco ni RPC
npx tsx makesnap.ts \
  --targets public/targets.json \
  --dry-run

# Opcion E: apuntar a un targets alterno (ej. mainnet vs testlist)
npx tsx makesnap.ts \
  --targets /tmp/targets_only_popcat.json \
  --out /tmp/scratch_out \
  --top 20
```

El script imprime progreso por consola con `[t+<seg>s]` y al final una
línea `MAKESNAP_RESULT {json}` con el resumen estructurado:

```json
{
  "ok": true,
  "elapsed_ms": 42153,
  "tokens": [{"slug":"popcat","ca":"7GCi…W2hr","ok":true,
              "holders_count":18234,"holders_top":100,
              "symbol":"POPCAT","supply":...,"price":...,
              "elapsed_ms":5210}, ...],
  "summary": {"processed":8,"ok":8,"fail":0}
}
```

#### Desde dentro del container

```bash
docker exec satelldexdemo npx tsx makesnap.ts
docker exec satelldexdemo npx tsx makesnap.ts --dry-run
docker exec satelldexdemo npx tsx makesnap.ts --top 50
```

Dentro del container la env `HELIUS_API_KEY` viene de `.env.local`
automáticamente — no hace falta exportarla.

### Endpoint GET

```bash
curl http://localhost:4950/api/regenerate
```

Devuelve el último `dexscraptokens.json` persistido. Sin auth (lectura
pública).

## Data files

```
public/
├── admins.json                 ← lista de pubkeys admin (badge + REGEN)
├── targets.json                ← lista de CAs a scrapear (editable)
├── home/                       ← imagenes de la landing (cmd.png, cmdsmall)
├── assets/                     ← imagenes generales (Node.png)
└── demo-data/
    ├── tokens.json                  ← 6 tokens legacy (slug + metadata fija)
    ├── snapshots/<slug>.json        ← per-token aggregated metrics (dummy)
    ├── holders/<slug>.json          ← top 200 holders (dummy)
    ├── community_requests.json      ← CRUD source of truth
    ├── dexscraptokens.json          ← output del scrape DexScreener (REGEN)
    └── global/
        ├── global_history.json      ← snapshot agregado multi-token
        └── categories.json          ← categorías (AI Agents / Memes / ...)
```

## Generadores dummy (legacy)

`gen_global_dummy.py` (Python, host) genera `global/global_history.json` y
`global/categories.json` con random walks plausibles (N_SNAPS=1).

```bash
cd /home/gman/asdb/dockersprod/sb_satelldexdemo
python3 gen_global_dummy.py
```

Los `snapshots/<slug>.json` y `holders/<slug>.json` están seedeados a mano
y no tienen generador. Si en un round futuro se suma Helius DAS, esos
shapes ricos los va a regenerar también el botón REGEN.

## Docker

Container: **`satelldexdemo`** (Next 16 en `node:20-alpine`).
Bind mount: `/home/gman/asdb/dockersprod/sb_satelldexdemo:/app`.
Working dir: `/app`. User: `1000:1002`.
Port: `127.0.0.1:4950 → :3000`. Restart: `unless-stopped`.

Rebuild después de cambios en el front:

```bash
cd /home/gman/asdb/dockersprod/sb_satelldexdemo
sudo rm -rf .next && yarn build
docker restart satelldexdemo
```

Recrear el container desde cero (ej. para sumar `-e HELIUS_API_KEY=...`):

```bash
docker stop satelldexdemo && docker rm satelldexdemo
docker run -d --name satelldexdemo --user 1000:1002 \
  -v /home/gman/asdb/dockersprod/sb_satelldexdemo:/app -w /app \
  -p 127.0.0.1:4950:3000 \
  --restart unless-stopped \
  -e HELIUS_API_KEY="hl_xxxxxxxx" \
  node20alp_nextimg
```

> **Nota**: el container se llamaba previamente `satelldexdemofront`. Fue
> renombrado a `satelldexdemo` el 12-may-26 porque el proyecto es unificado
> (Next 16 sirve front + Route Handlers, sin servicio backend separado).

## Env vars

```
Var                       | Default                              | Uso
--------------------------|--------------------------------------|--------------
NEXT_PUBLIC_SOLANA_RPC    | https://api.mainnet-beta.solana.com  | RPC del ConnectionProvider
```

DexScreener no requiere API key. `.env.local` está gitignored.
