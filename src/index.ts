#!/usr/bin/env node
import { Command } from "commander";
import { saveConfig } from "./config.js";
import { cmdFundLink } from "./fund-commands.js";
import { CLI_VERSION } from "./package-meta.js";
import {
  cmdPay,
  cmdPayUrl,
  cmdResolve,
  cmdVerify,
  cmdWalletStatus,
} from "./pay-commands.js";
import {
  cmdConnectLogin,
  cmdConnectOnboard,
  cmdConnectStatus,
  cmdConnectSync,
  cmdRecycle,
  cmdWithdraw,
} from "./connect-commands.js";
import {
  cmdCreatePayLink,
  cmdCreateSeller,
  cmdEnablePayments,
  cmdWebhooksCreate,
  cmdWebhooksList,
} from "./accept-commands.js";
import {
  cmdBalance,
  cmdCreateResource,
  cmdListResources,
} from "./seller-commands.js";
import { printError, printOk } from "./tui.js";

const program = new Command();

program
  .name("rill")
  .description(
    "Rill CLI, Accept (gate URL + webhook), Spend pay-url, Connect, fund links",
  )
  .version(CLI_VERSION)
  .option("--key <vwKey>", "Virtual wallet key (or RILL_VW_KEY / saved config)")
  .option("--seller-key <sellerKey>", "Seller key (or RILL_SELLER_KEY)")
  .option("--owner-jwt <jwt>", "Owner Supabase JWT (or RILL_OWNER_JWT)")
  .option(
    "--environment <live|test>",
    "Money mode for owner JWT calls (or RILL_ENVIRONMENT). VW/seller keys encode mode in the prefix (rill_vw_test_* / rill_sk_test_*)",
    "live",
  )
  .option("--json", "Machine-readable JSON output");

program
  .command("pay-url")
  .description("Pay any HTTPS MPP/x402 URL (primary open-world Spend)")
  .requiredOption("--url <https>", "Paid resource URL")
  .option("--method <http>", "HTTP method (default GET)")
  .option("--max-amount <usd>", "USD cap for this pay")
  .action(
    async (opts: { url: string; method?: string; maxAmount?: string }) => {
      const root = program.opts<{ key?: string; json?: boolean }>();
      await cmdPayUrl({
        url: opts.url,
        method: opts.method,
        maxAmount: opts.maxAmount,
        key: root.key,
        json: root.json,
      });
    },
  );

program
  .command("pay")
  .description("Background ledger: pay a resource or transfer to a handle / FQDN")
  .option("--resource <id>", "Resource id")
  .option("--to <fqdn>", "Destination handle or agent FQDN")
  .option("--amount <usd>", "Transfer amount (required with --to)")
  .action(async (opts: { resource?: string; to?: string; amount?: string }) => {
    const root = program.opts<{ key?: string; json?: boolean }>();
    await cmdPay({
      resourceId: opts.resource,
      to: opts.to,
      amount: opts.amount,
      key: root.key,
      json: root.json,
    });
  });

program
  .command("verify")
  .argument("<receiptId>", "Receipt id")
  .description("Verify a receipt")
  .action(async (receiptId: string) => {
    const root = program.opts<{ json?: boolean }>();
    await cmdVerify(receiptId, { json: root.json });
  });

program
  .command("resolve")
  .argument("<fqdn>", "Handle or agent FQDN")
  .description("Resolve a pay address")
  .action(async (fqdn: string) => {
    const root = program.opts<{ json?: boolean }>();
    await cmdResolve(fqdn, { json: root.json });
  });

program
  .command("wallet-status")
  .description("Show virtual wallet allowance")
  .action(async () => {
    const root = program.opts<{ key?: string; json?: boolean }>();
    await cmdWalletStatus({ key: root.key, json: root.json });
  });

program
  .command("balance")
  .description("Seller balance or VW status")
  .action(async () => {
    const root = program.opts<{
      key?: string;
      sellerKey?: string;
      json?: boolean;
    }>();
    await cmdBalance({
      key: root.key,
      sellerKey: root.sellerKey,
      json: root.json,
    });
  });

program
  .command("resources")
  .description("List seller resources")
  .action(async () => {
    const root = program.opts<{ sellerKey?: string; json?: boolean }>();
    await cmdListResources({ sellerKey: root.sellerKey, json: root.json });
  });

program
  .command("create-resource")
  .requiredOption("--path <path>", "HTTP path or tool name")
  .requiredOption("--amount <usd>", "Price in USD")
  .description("Create a priced resource (prints gate_url)")
  .action(async (opts: { path: string; amount: string }) => {
    const root = program.opts<{ sellerKey?: string; json?: boolean }>();
    await cmdCreateResource({
      path: opts.path,
      amount: opts.amount,
      sellerKey: root.sellerKey,
      json: root.json,
    });
  });

program
  .command("create-seller")
  .requiredOption("--name <name>", "Seller display name")
  .description("Create an Accept seller (owner JWT); prints rill_sk_* once")
  .action(async (opts: { name: string }) => {
    const root = program.opts<{ ownerJwt?: string; json?: boolean }>();
    await cmdCreateSeller({
      name: opts.name,
      ownerJwt: root.ownerJwt,
      json: root.json,
    });
  });

program
  .command("create-pay-link")
  .option("--path <path>", "HTTP path or tool name (when creating)")
  .option("--amount <usd>", "Price in USD (when creating)")
  .option("--resource <id>", "Existing resource id to compose URLs for")
  .option("--embed", "Also print balise HTML")
  .description("Create/share Accept gate URL (agents pay this)")
  .action(
    async (opts: {
      path?: string;
      amount?: string;
      resource?: string;
      embed?: boolean;
    }) => {
      const root = program.opts<{ sellerKey?: string; json?: boolean }>();
      await cmdCreatePayLink({
        path: opts.path,
        amount: opts.amount,
        resourceId: opts.resource,
        embed: opts.embed,
        sellerKey: root.sellerKey,
        json: root.json,
      });
    },
  );

program
  .command("enable-payments")
  .option("--profile <profile_…>", "Optional Stripe Profile id")
  .description("Turn on MPP/x402 on seller gate URLs")
  .action(async (opts: { profile?: string }) => {
    const root = program.opts<{ sellerKey?: string; json?: boolean }>();
    await cmdEnablePayments({
      profile: opts.profile,
      sellerKey: root.sellerKey,
      json: root.json,
    });
  });

const webhooks = program
  .command("webhooks")
  .description("Owner webhooks (payment.succeeded unlocks your product)");

webhooks
  .command("list")
  .description("List webhook endpoints")
  .action(async () => {
    const root = program.opts<{ ownerJwt?: string; json?: boolean }>();
    await cmdWebhooksList({ ownerJwt: root.ownerJwt, json: root.json });
  });

webhooks
  .command("create")
  .requiredOption("--url <https>", "HTTPS callback URL")
  .description("Register webhook; prints signing secret once")
  .action(async (opts: { url: string }) => {
    const root = program.opts<{ ownerJwt?: string; json?: boolean }>();
    await cmdWebhooksCreate({
      url: opts.url,
      ownerJwt: root.ownerJwt,
      json: root.json,
    });
  });

program
  .command("fund-link")
  .requiredOption("--wallet <id>", "Account wallet id")
  .requiredOption("--amount <usd>", "Top-up amount")
  .description("Create a Stripe Checkout fund URL")
  .action(async (opts: { wallet: string; amount: string }) => {
    const root = program.opts<{ ownerJwt?: string; json?: boolean }>();
    await cmdFundLink({
      walletId: opts.wallet,
      amount: opts.amount,
      ownerJwt: root.ownerJwt,
      json: root.json,
    });
  });

const connect = program
  .command("connect")
  .description("Stripe Express Connect off-ramp");

connect
  .command("onboard")
  .option("--country <code>", "ISO country for new Express accounts", "US")
  .description("Create Express Account Link URL")
  .action(async (opts: { country?: string }) => {
    const root = program.opts<{ sellerKey?: string; json?: boolean }>();
    await cmdConnectOnboard({
      sellerKey: root.sellerKey,
      country: opts.country,
      json: root.json,
    });
  });

connect
  .command("status")
  .description("Show enriched Connect status")
  .action(async () => {
    const root = program.opts<{ sellerKey?: string; json?: boolean }>();
    await cmdConnectStatus({ sellerKey: root.sellerKey, json: root.json });
  });

connect
  .command("sync")
  .description("Sync Connect account from Stripe")
  .action(async () => {
    const root = program.opts<{ sellerKey?: string; json?: boolean }>();
    await cmdConnectSync({ sellerKey: root.sellerKey, json: root.json });
  });

connect
  .command("login")
  .description("Express login URL for outstanding Connect requirements")
  .action(async () => {
    const root = program.opts<{ sellerKey?: string; json?: boolean }>();
    await cmdConnectLogin({ sellerKey: root.sellerKey, json: root.json });
  });

program
  .command("withdraw")
  .requiredOption("--amount <usd>", "Withdrawal amount")
  .description("Withdraw seller balance via Connect Transfer")
  .action(async (opts: { amount: string }) => {
    const root = program.opts<{ sellerKey?: string; json?: boolean }>();
    await cmdWithdraw({
      amount: opts.amount,
      sellerKey: root.sellerKey,
      json: root.json,
    });
  });

program
  .command("recycle")
  .requiredOption("--seller <id>", "Seller id")
  .requiredOption("--amount <usd>", "Amount to recycle")
  .description("Recycle seller balance into owner account wallet")
  .action(async (opts: { seller: string; amount: string }) => {
    const root = program.opts<{ ownerJwt?: string; json?: boolean }>();
    await cmdRecycle({
      sellerId: opts.seller,
      amount: opts.amount,
      ownerJwt: root.ownerJwt,
      json: root.json,
    });
  });

program
  .command("config")
  .description("Save keys to ~/.config/rill/config.json")
  .option("--vw-key <key>", "Save virtual wallet key")
  .option("--seller-key <key>", "Save seller key")
  .option("--owner-jwt <jwt>", "Save owner JWT")
  .action(
    async (opts: { vwKey?: string; sellerKey?: string; ownerJwt?: string }) => {
      if (!opts.vwKey && !opts.sellerKey && !opts.ownerJwt) {
        printError("Pass --vw-key, --seller-key, and/or --owner-jwt");
        process.exitCode = 1;
        return;
      }
      const file = await saveConfig({
        vwKey: opts.vwKey,
        sellerKey: opts.sellerKey,
        ownerJwt: opts.ownerJwt,
      });
      printOk(`Saved ${file}`);
    },
  );

program.hook("preAction", () => {
  const root = program.opts<{ environment?: string }>();
  const env = root.environment?.trim().toLowerCase();
  if (env === "live" || env === "test") {
    process.env.RILL_ENVIRONMENT = env;
  }
});

program.parseAsync(process.argv).catch((err) => {
  printError(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
