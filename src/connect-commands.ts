import { callApi } from "./api-client.js";
import { apiError } from "./api-error.js";
import { resolveOwnerJwtAsync, resolveSellerKeyAsync } from "./env.js";
import { printError, printJson, printOk } from "./tui.js";

async function withSeller(
  sellerKey: string | undefined,
  run: (apiKey: string) => Promise<void>,
) {
  const apiKey = await resolveSellerKeyAsync(sellerKey);
  if (!apiKey) {
    printError("Missing seller key. Pass --seller-key or set RILL_SELLER_KEY.");
    process.exitCode = 1;
    return;
  }
  await run(apiKey);
}

export async function cmdConnectOnboard(opts: {
  sellerKey?: string;
  country?: string;
  json?: boolean;
}) {
  await withSeller(opts.sellerKey, async (apiKey) => {
    const res = await callApi({
      method: "POST",
      path: "/sellers/me/connect/onboard",
      apiKey,
      body: opts.country ? { country: opts.country } : {},
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
    const body = res.body as { onboard_url?: string };
    printOk("Open onboard_url in a browser for Express KYC");
    if (body.onboard_url) printOk(body.onboard_url);
    printJson(res.body);
  });
}

export async function cmdConnectStatus(opts: {
  sellerKey?: string;
  json?: boolean;
}) {
  await withSeller(opts.sellerKey, async (apiKey) => {
    const res = await callApi({
      method: "GET",
      path: "/sellers/me/connect",
      apiKey,
    });
    if (opts.json || !res.ok) {
      printJson(res.body);
      if (!res.ok) {
        if (!opts.json) printError(apiError(res.body));
        process.exitCode = 1;
      }
      return;
    }
    printJson(res.body);
  });
}

export async function cmdConnectSync(opts: {
  sellerKey?: string;
  json?: boolean;
}) {
  await withSeller(opts.sellerKey, async (apiKey) => {
    const res = await callApi({
      method: "POST",
      path: "/sellers/me/connect/sync",
      apiKey,
    });
    if (opts.json || !res.ok) {
      printJson(res.body);
      if (!res.ok) {
        if (!opts.json) printError(apiError(res.body));
        process.exitCode = 1;
      }
      return;
    }
    printOk("Connect status synced");
    printJson(res.body);
  });
}

export async function cmdConnectLogin(opts: {
  sellerKey?: string;
  json?: boolean;
}) {
  await withSeller(opts.sellerKey, async (apiKey) => {
    const res = await callApi({
      method: "POST",
      path: "/sellers/me/connect/login-link",
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
    const body = res.body as { login_url?: string };
    printOk("Open login_url to finish outstanding Connect requirements");
    if (body.login_url) printOk(body.login_url);
    printJson(res.body);
  });
}

export async function cmdWithdraw(opts: {
  amount: string;
  sellerKey?: string;
  json?: boolean;
}) {
  await withSeller(opts.sellerKey, async (apiKey) => {
    const res = await callApi({
      method: "POST",
      path: "/sellers/me/withdraw",
      apiKey,
      idempotencyKey: `cli-withdraw-${Date.now()}`,
      body: { amount: Number(opts.amount) },
    });
    if (opts.json || !res.ok) {
      printJson(res.body);
      if (!res.ok) {
        if (!opts.json) printError(apiError(res.body));
        process.exitCode = 1;
      }
      return;
    }
    printOk("Withdrawal submitted");
    printJson(res.body);
  });
}

export async function cmdRecycle(opts: {
  sellerId: string;
  amount: string;
  ownerJwt?: string;
  json?: boolean;
}) {
  const jwt = await resolveOwnerJwtAsync(opts.ownerJwt);
  if (!jwt) {
    printError("Missing owner JWT. Pass --owner-jwt or set RILL_OWNER_JWT.");
    process.exitCode = 1;
    return;
  }
  const res = await callApi({
    method: "POST",
    path: `/sellers/${encodeURIComponent(opts.sellerId)}/recycle`,
    apiKey: jwt,
    body: { amount: Number(opts.amount) },
  });
  if (opts.json || !res.ok) {
    printJson(res.body);
    if (!res.ok) {
      if (!opts.json) printError(apiError(res.body));
      process.exitCode = 1;
    }
    return;
  }
  printOk("Recycled to account wallet");
  printJson(res.body);
}
