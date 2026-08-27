import { randomUUID } from "node:crypto";
import { callApi } from "./api-client.js";
import { apiError } from "./api-error.js";
import { resolveVwKeyAsync } from "./env.js";
import { printError, printJson, printOk } from "./tui.js";

/** Primary open-world Spend: POST /spend/pay-url */
export async function cmdPayUrl(opts: {
  url: string;
  method?: string;
  maxAmount?: string;
  key?: string;
  json?: boolean;
}) {
  const apiKey = await resolveVwKeyAsync(opts.key);
  if (!apiKey) {
    printError("Missing VW key. Pass --key or set RILL_VW_KEY.");
    process.exitCode = 1;
    return;
  }

  const body: Record<string, unknown> = { url: opts.url };
  if (opts.method) body.method = opts.method;
  if (opts.maxAmount) body.max_amount = Number(opts.maxAmount);

  const res = await callApi({
    method: "POST",
    path: "/spend/pay-url",
    apiKey,
    body,
    idempotencyKey: randomUUID(),
  });

  if (opts.json) {
    printJson(res.body);
    if (!res.ok) process.exitCode = 1;
    return;
  }

  if (!res.ok) {
    printError(apiError(res.body));
    process.exitCode = 1;
    return;
  }
  printOk("Pay-url settled (MPP/x402)");
  printJson(res.body);
}

/** Background ledger: POST /pay */
export async function cmdPay(opts: {
  resourceId?: string;
  to?: string;
  amount?: string;
  key?: string;
  json?: boolean;
}) {
  const apiKey = await resolveVwKeyAsync(opts.key);
  if (!apiKey) {
    printError("Missing VW key. Pass --key or set RILL_VW_KEY.");
    process.exitCode = 1;
    return;
  }

  const body: Record<string, unknown> = {};
  if (opts.resourceId) body.resource_id = opts.resourceId;
  if (opts.to) {
    body.to = opts.to;
    body.amount = Number(opts.amount);
  }
  if (!opts.resourceId && !opts.to) {
    printError("Provide --resource <id> or --to <fqdn> --amount <usd>");
    process.exitCode = 1;
    return;
  }

  const res = await callApi({
    method: "POST",
    path: "/pay",
    apiKey,
    body,
    idempotencyKey: randomUUID(),
  });

  if (opts.json) {
    printJson(res.body);
    if (!res.ok) process.exitCode = 1;
    return;
  }

  if (!res.ok) {
    printError(apiError(res.body));
    process.exitCode = 1;
    return;
  }
  printOk("Payment settled");
  printJson(res.body);
}

export async function cmdVerify(receiptId: string, opts: { json?: boolean }) {
  const res = await callApi({
    method: "POST",
    path: "/access/verify",
    body: { receipt_id: receiptId },
  });
  if (opts.json) {
    printJson(res.body);
    if (!res.ok) process.exitCode = 1;
    return;
  }
  if (!res.ok) {
    printError(apiError(res.body));
    process.exitCode = 1;
    return;
  }
  printOk("Receipt verified");
  printJson(res.body);
}

export async function cmdResolve(fqdn: string, opts: { json?: boolean }) {
  const res = await callApi({
    method: "GET",
    path: `/handles/resolve/${encodeURIComponent(fqdn)}`,
  });
  if (opts.json) {
    printJson(res.body);
    if (!res.ok) process.exitCode = 1;
    return;
  }
  if (!res.ok) {
    printError(apiError(res.body));
    process.exitCode = 1;
    return;
  }
  printJson(res.body);
}

export async function cmdWalletStatus(opts: { key?: string; json?: boolean }) {
  const apiKey = await resolveVwKeyAsync(opts.key);
  if (!apiKey) {
    printError("Missing VW key. Pass --key or set RILL_VW_KEY.");
    process.exitCode = 1;
    return;
  }
  const res = await callApi({
    method: "GET",
    path: "/wallets/me/status",
    apiKey,
  });
  if (opts.json) {
    printJson(res.body);
    if (!res.ok) process.exitCode = 1;
    return;
  }
  if (!res.ok) {
    printError(apiError(res.body));
    process.exitCode = 1;
    return;
  }
  printJson(res.body);
}
