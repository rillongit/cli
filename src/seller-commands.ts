import { callApi } from "./api-client.js";
import { apiError } from "./api-error.js";
import { resolveSellerKeyAsync, resolveVwKeyAsync } from "./env.js";
import { printError, printJson, printOk } from "./tui.js";

export async function cmdBalance(opts: {
  key?: string;
  sellerKey?: string;
  json?: boolean;
}) {
  const seller = await resolveSellerKeyAsync(opts.sellerKey);
  const vw = await resolveVwKeyAsync(opts.key);
  const apiKey = seller || vw;
  if (!apiKey) {
    printError("Missing seller or VW key.");
    process.exitCode = 1;
    return;
  }

  const path = seller ? "/sellers/me" : "/wallets/me/status";
  const res = await callApi({ method: "GET", path, apiKey });
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

export async function cmdListResources(opts: {
  sellerKey?: string;
  json?: boolean;
}) {
  const apiKey = await resolveSellerKeyAsync(opts.sellerKey);
  if (!apiKey) {
    printError("Missing seller key. Pass --seller-key or set RILL_SELLER_KEY.");
    process.exitCode = 1;
    return;
  }
  const res = await callApi({ method: "GET", path: "/resources", apiKey });
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

export async function cmdCreateResource(opts: {
  path: string;
  amount: string;
  sellerKey?: string;
  json?: boolean;
}) {
  const apiKey = await resolveSellerKeyAsync(opts.sellerKey);
  if (!apiKey) {
    printError("Missing seller key. Pass --seller-key or set RILL_SELLER_KEY.");
    process.exitCode = 1;
    return;
  }
  const res = await callApi({
    method: "POST",
    path: "/resources",
    apiKey,
    body: {
      resource_type: "http",
      path_or_tool: opts.path,
      amount: Number(opts.amount),
    },
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
  const body = res.body as {
    resource?: {
      id?: string;
      short_id?: string;
      gate_url?: string;
      pay_url?: string;
    };
  };
  const resource = body.resource;
  const gateUrl = resource?.gate_url;
  if (gateUrl) {
    printOk(`gate_url: ${gateUrl}`);
    if (resource?.pay_url) console.log(`pay_page_url: ${resource.pay_url}`);
    if (resource?.short_id) console.log(`short_id: ${resource.short_id}`);
    if (resource?.id) console.log(`resource_id: ${resource.id}`);
    return;
  }
  printOk("Resource created");
  printJson(res.body);
}

export async function cmdUpdateResource(opts: {
  resourceId: string;
  path?: string;
  amount?: string;
  deactivate?: boolean;
  sellerKey?: string;
  json?: boolean;
}) {
  const apiKey = await resolveSellerKeyAsync(opts.sellerKey);
  if (!apiKey) {
    printError("Missing seller key. Pass --seller-key or set RILL_SELLER_KEY.");
    process.exitCode = 1;
    return;
  }
  const body: Record<string, unknown> = {};
  if (opts.deactivate) body.active = false;
  if (opts.path?.trim()) body.path_or_tool = opts.path.trim();
  if (opts.amount) body.amount = Number(opts.amount);
  if (Object.keys(body).length === 0) {
    printError("Pass --path, --amount, and/or --deactivate.");
    process.exitCode = 1;
    return;
  }
  const res = await callApi({
    method: "PATCH",
    path: `/resources/${encodeURIComponent(opts.resourceId)}`,
    apiKey,
    body,
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
  printOk(opts.deactivate ? "Resource deactivated." : "Resource updated.");
  printJson(res.body);
}
