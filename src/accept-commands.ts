import { randomUUID } from "node:crypto";
import { callApi } from "./api-client.js";
import { apiError } from "./api-error.js";
import {
  getApiBaseUrl,
  getAppBaseUrl,
  resolveOwnerJwtAsync,
  resolveSellerKeyAsync,
} from "./env.js";
import { printError, printJson, printOk } from "./tui.js";

type ResourceBody = {
  ok?: boolean;
  resource?: {
    id?: string;
    short_id?: string;
    amount?: string | number;
    pay_url?: string;
    gate_url?: string;
  };
  seller?: {
    id?: string;
    api_key?: string;
    name?: string;
    mpp_enabled?: boolean;
    x402_enabled?: boolean;
  };
  webhook?: {
    id?: string;
    url?: string;
    secret?: string;
    events?: string[];
  };
  webhooks?: unknown[];
};

function printGateFirst(opts: {
  gateUrl: string;
  payPageUrl: string;
  shortId?: string | null;
  resourceId?: string | null;
  amount?: string | number | null;
  baliseHtml?: string | null;
  showEmbed?: boolean;
}) {
  printOk(`gate_url: ${opts.gateUrl}`);
  console.log(`pay_page_url: ${opts.payPageUrl}`);
  if (opts.shortId) console.log(`short_id: ${opts.shortId}`);
  if (opts.resourceId) console.log(`resource_id: ${opts.resourceId}`);
  if (opts.amount != null) console.log(`amount: ${opts.amount}`);
  if (opts.showEmbed && opts.baliseHtml) {
    console.log(`balise_html:\n${opts.baliseHtml}`);
  }
}

export async function cmdCreateSeller(opts: {
  name: string;
  websiteUrl?: string;
  description?: string;
  ownerJwt?: string;
  json?: boolean;
}) {
  const jwt = await resolveOwnerJwtAsync(opts.ownerJwt);
  if (!jwt) {
    printError("Missing owner JWT. Pass --owner-jwt or set RILL_OWNER_JWT.");
    process.exitCode = 1;
    return;
  }

  const res = await callApi<ResourceBody>({
    method: "POST",
    path: "/sellers",
    apiKey: jwt,
    body: {
      name: opts.name,
      website_url: opts.websiteUrl,
      description: opts.description,
    },
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

  const key = res.body.seller?.api_key;
  const id = res.body.seller?.id;
  if (key) {
    printOk(`Seller created. Save rill_sk_* now (shown once):`);
    console.log(key);
  } else {
    printOk("Seller created");
  }
  if (id) console.log(`seller_id: ${id}`);
}

export async function cmdSellersList(opts: {
  ownerJwt?: string;
  json?: boolean;
}) {
  const jwt = await resolveOwnerJwtAsync(opts.ownerJwt);
  if (!jwt) {
    printError("Missing owner JWT. Pass --owner-jwt or set RILL_OWNER_JWT.");
    process.exitCode = 1;
    return;
  }
  const res = await callApi<{ ok?: boolean; sellers?: unknown[] }>({
    method: "GET",
    path: "/sellers",
    apiKey: jwt,
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
  const list = res.body.sellers ?? [];
  if (list.length === 0) {
    printOk("No sellers yet.");
    return;
  }
  printJson(list);
}

export async function cmdSellersRotate(opts: {
  sellerId: string;
  ownerJwt?: string;
  json?: boolean;
}) {
  const jwt = await resolveOwnerJwtAsync(opts.ownerJwt);
  if (!jwt) {
    printError("Missing owner JWT. Pass --owner-jwt or set RILL_OWNER_JWT.");
    process.exitCode = 1;
    return;
  }
  const res = await callApi<ResourceBody>({
    method: "POST",
    path: `/sellers/${encodeURIComponent(opts.sellerId)}/rotate-key`,
    apiKey: jwt,
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
  const key = res.body.seller?.api_key;
  printOk("Seller key rotated. Save rill_sk_* now (shown once):");
  if (key) console.log(key);
}

export async function cmdSellersUpdate(opts: {
  websiteUrl?: string;
  description?: string;
  sellerKey?: string;
  json?: boolean;
}) {
  const apiKey = await resolveSellerKeyAsync(opts.sellerKey);
  if (!apiKey) {
    printError("Missing seller key. Pass --seller-key or set RILL_SELLER_KEY.");
    process.exitCode = 1;
    return;
  }
  const res = await callApi<ResourceBody>({
    method: "PATCH",
    path: "/sellers/me",
    apiKey,
    body: {
      website_url: opts.websiteUrl,
      description: opts.description,
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
  printOk("Seller listing updated.");
  printJson(res.body.seller ?? res.body);
}

export async function cmdCreatePayLink(opts: {
  path?: string;
  amount?: string;
  resourceId?: string;
  embed?: boolean;
  sellerKey?: string;
  json?: boolean;
}) {
  const apiKey = await resolveSellerKeyAsync(opts.sellerKey);
  if (!apiKey) {
    printError("Missing seller key. Pass --seller-key or set RILL_SELLER_KEY.");
    process.exitCode = 1;
    return;
  }

  const api = getApiBaseUrl();
  const app = getAppBaseUrl();
  let resourceId = opts.resourceId?.trim();
  let shortId: string | undefined;
  let amount: string | number | undefined = opts.amount
    ? Number(opts.amount)
    : undefined;
  let gateUrl: string | undefined;
  let payPageUrl: string | undefined;

  if (!resourceId) {
    if (!opts.path?.trim() || opts.amount == null) {
      printError("Provide --resource <id>, or --path and --amount.");
      process.exitCode = 1;
      return;
    }
    const res = await callApi<ResourceBody>({
      method: "POST",
      path: "/resources",
      apiKey,
      body: {
        resource_type: "http",
        path_or_tool: opts.path,
        amount: Number(opts.amount),
      },
      idempotencyKey: randomUUID(),
    });
    if (opts.json) {
      const resource = res.body.resource;
      const publicCode = resource?.short_id ?? resource?.id;
      const composed = resource
        ? {
            ok: res.ok,
            resource_id: resource.id,
            short_id: resource.short_id ?? null,
            amount: resource.amount ?? Number(opts.amount),
            gate_url: resource.gate_url ?? (publicCode ? `${api}/r/${publicCode}` : null),
            pay_page_url:
              resource.pay_url ?? (publicCode ? `${app}/r/${publicCode}` : null),
            balise_html: publicCode
              ? `<script src="${app}/rill-balise.js" data-resource-id="${publicCode}" data-api-base="${api}" async></script>`
              : null,
            resource,
          }
        : res.body;
      printJson(composed);
      if (!res.ok) process.exitCode = 1;
      return;
    }
    if (!res.ok) {
      printError(apiError(res.body));
      process.exitCode = 1;
      return;
    }
    const resource = res.body.resource;
    resourceId = resource?.id;
    shortId = resource?.short_id;
    amount = resource?.amount ?? Number(opts.amount);
    const publicCode = shortId ?? resourceId;
    if (!publicCode) {
      printError("Resource create missing id.");
      process.exitCode = 1;
      return;
    }
    gateUrl = resource?.gate_url ?? `${api}/r/${publicCode}`;
    payPageUrl = resource?.pay_url ?? `${app}/r/${publicCode}`;
    const baliseHtml = `<script src="${app}/rill-balise.js" data-resource-id="${publicCode}" data-api-base="${api}" async></script>`;
    printGateFirst({
      gateUrl,
      payPageUrl,
      shortId,
      resourceId,
      amount,
      baliseHtml,
      showEmbed: opts.embed,
    });
    return;
  }

  const termsRes = await callApi<{
    payment_terms?: {
      amount?: unknown;
      gate_url?: string;
      pay_page_url?: string;
      resource_id?: string;
    };
  }>({
    method: "POST",
    path: `/resources/${encodeURIComponent(resourceId)}/terms`,
    apiKey,
  });

  if (opts.json) {
    printJson(termsRes.body);
    if (!termsRes.ok) process.exitCode = 1;
    return;
  }
  if (!termsRes.ok) {
    printError(apiError(termsRes.body));
    process.exitCode = 1;
    return;
  }

  const terms = termsRes.body.payment_terms;
  gateUrl = terms?.gate_url ?? `${api}/r/${resourceId}`;
  payPageUrl = terms?.pay_page_url ?? `${app}/r/${resourceId}`;
  const publicCode = gateUrl.split("/").pop() || resourceId;
  const baliseHtml = `<script src="${app}/rill-balise.js" data-resource-id="${publicCode}" data-api-base="${api}" async></script>`;
  printGateFirst({
    gateUrl,
    payPageUrl,
    shortId: publicCode,
    resourceId: terms?.resource_id ?? resourceId,
    amount: (terms?.amount as string | number | undefined) ?? amount,
    baliseHtml,
    showEmbed: opts.embed,
  });
}

export async function cmdEnablePayments(opts: {
  profile?: string;
  sellerKey?: string;
  json?: boolean;
}) {
  const apiKey = await resolveSellerKeyAsync(opts.sellerKey);
  if (!apiKey) {
    printError("Missing seller key. Pass --seller-key or set RILL_SELLER_KEY.");
    process.exitCode = 1;
    return;
  }

  const body: {
    mpp_enabled: boolean;
    x402_enabled: boolean;
    stripe_profile_id?: string;
  } = {
    mpp_enabled: true,
    x402_enabled: true,
  };
  if (opts.profile?.trim()) {
    body.stripe_profile_id = opts.profile.trim();
  }

  const res = await callApi<ResourceBody>({
    method: "PATCH",
    path: "/sellers/me/payments",
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

  printOk("Payments enabled on seller gates (MPP/x402).");
  const seller = res.body.seller;
  if (seller) {
    console.log(
      `mpp_enabled=${Boolean(seller.mpp_enabled)} x402_enabled=${Boolean(seller.x402_enabled)}`,
    );
  }
}

export async function cmdWebhooksList(opts: {
  ownerJwt?: string;
  json?: boolean;
}) {
  const jwt = await resolveOwnerJwtAsync(opts.ownerJwt);
  if (!jwt) {
    printError("Missing owner JWT. Pass --owner-jwt or set RILL_OWNER_JWT.");
    process.exitCode = 1;
    return;
  }

  const res = await callApi<ResourceBody>({
    method: "GET",
    path: "/webhooks",
    apiKey: jwt,
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

  const list = res.body.webhooks ?? [];
  if (list.length === 0) {
    printOk("No webhooks yet.");
    return;
  }
  printJson(list);
}

export async function cmdWebhooksCreate(opts: {
  url: string;
  ownerJwt?: string;
  json?: boolean;
}) {
  const jwt = await resolveOwnerJwtAsync(opts.ownerJwt);
  if (!jwt) {
    printError("Missing owner JWT. Pass --owner-jwt or set RILL_OWNER_JWT.");
    process.exitCode = 1;
    return;
  }

  const res = await callApi<ResourceBody>({
    method: "POST",
    path: "/webhooks",
    apiKey: jwt,
    body: { url: opts.url },
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

  const hook = res.body.webhook;
  printOk("Webhook registered (defaults include payment.succeeded).");
  if (hook?.url) console.log(`url: ${hook.url}`);
  if (hook?.id) console.log(`id: ${hook.id}`);
  if (hook?.secret) {
    printOk("Signing secret, copy now (shown once):");
    console.log(hook.secret);
  }
}

export async function cmdWebhooksTest(opts: {
  webhookId: string;
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
    path: `/webhooks/${encodeURIComponent(opts.webhookId)}/test`,
    apiKey: jwt,
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
  printOk("Test event queued.");
  printJson(res.body);
}

export async function cmdWebhooksDelete(opts: {
  webhookId: string;
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
    method: "DELETE",
    path: `/webhooks/${encodeURIComponent(opts.webhookId)}`,
    apiKey: jwt,
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
  printOk("Webhook deleted.");
}