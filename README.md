# Rill CLI

Accept (gate URL + webhook), Spend pay-url, Connect off-ramp, and fund links.

## Install

```bash
# Preferred once published
npm install -g @rill/cli

# From this repo (builds on install)
npm install -g github:rillongit/cli

# Or run without a global install
npx --yes github:rillongit/cli --help
```

## Install / run (monorepo)

```bash
pnpm --filter @rill/cli dev -- --help
pnpm --filter @rill/cli build
node apps/cli/dist/index.js --help
```

Root aliases: `pnpm cli`, `pnpm dev:cli`.

## Auth

| Flag / env | Role |
| --- | --- |
| `--key` / `RILL_VW_KEY` | Agent spend (`rill_vw_*` or `rill_vw_test_*`) |
| `--seller-key` / `RILL_SELLER_KEY` | Accept seller (`rill_sk_*` or `rill_sk_test_*`) |
| `--owner-jwt` / `RILL_OWNER_JWT` | Owner JWT (create seller, webhooks, fund links) |
| `--environment` / `RILL_ENVIRONMENT` | `live` (default) or `test` for owner JWT calls (`X-Rill-Environment`). VW/seller keys encode mode in the prefix. |

Keys can also be saved with `rill config --vw-key …` → `~/.config/rill/config.json`.

```bash
# Test money tree (owner JWT)
rill --environment test --owner-jwt "$JWT" create-seller --name "Acme Test"
rill --environment test fund-link --wallet <test_wallet_id> --amount 10

# Or use a test key directly (no header needed)
rill --key rill_vw_test_… pay-url --url https://…
```

## Accept go-live

```bash
rill create-seller --name "Acme"
# save rill_sk_* → rill config --seller-key rill_sk_…

rill create-pay-link --path /premium --amount 0.50
# prints gate_url first (agents pay this); pay_page_url for humans

rill enable-payments
rill webhooks create --url https://example.com/rill-hooks
# save signing secret once

# Test buyer (Spend)
rill pay-url --url <gate_url>
```

## Commands

```bash
# Accept
rill create-seller --name Acme
rill create-pay-link --path /premium --amount 0.50
rill create-pay-link --resource <id>          # compose URLs for existing SKU
rill create-pay-link --path /x --amount 1 --embed
rill enable-payments
rill enable-payments --profile profile_…
rill webhooks list
rill webhooks create --url https://example.com/hooks
rill resources
rill create-resource --path /premium --amount 0.50   # also prints gate_url

# Primary Spend (open world)
rill pay-url --url https://example.com/paid
rill pay-url --url https://example.com/paid --max-amount 2.00

# Background ledger
rill pay --resource <id>
rill pay --to research.acme.userill.com --amount 1.5

rill verify <receiptId>
rill resolve research.acme.userill.com
rill wallet-status
rill balance
rill fund-link --wallet <id> --amount 10

# Connect off-ramp (ledger balance)
rill connect onboard --country US
rill connect status
rill connect sync
rill connect login
rill withdraw --amount 5
rill recycle --seller <id> --amount 5

rill config --vw-key rill_vw_… --seller-key rill_sk_…
```

Use `--json` for machine-readable output (includes `balise_html` on create-pay-link).

CLI twins match MCP Accept tools: `create-seller`, `create-pay-link`, `enable-payments`, `webhooks`. Prefer MCP for claim/mint/register and guest cold-start.

## Monorepo

This repo is the public submodule [`rillongit/cli`](https://github.com/rillongit/cli) at `apps/cli` in the private Rill monorepo.
