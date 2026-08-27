import { randomUUID } from "node:crypto";
import { callApi } from "./api-client.js";
import { apiError } from "./api-error.js";
import { resolveOwnerJwtAsync } from "./env.js";
import { printError, printJson, printOk } from "./tui.js";

export async function cmdFundLink(opts: {
  walletId: string;
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
    path: `/accounts/${opts.walletId}/fund-checkout`,
    apiKey: jwt,
    body: { amount: Number(opts.amount) },
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

  const body = res.body as { checkout_url?: string };
  if (body.checkout_url) {
    printOk(body.checkout_url);
  } else {
    printJson(res.body);
  }
}
