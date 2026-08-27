/**
 * Smoke: hit public agent capabilities; optionally wallet status when RILL_VW_KEY is set.
 */
import { callApi } from "../src/api-client.js";
import { resolveVwKeyAsync } from "../src/env.js";

const run = async () => {
  const caps = await callApi<{ ok?: boolean }>({
    method: "GET",
    path: "/agent/capabilities",
  });
  if (!caps.ok) {
    throw new Error(
      `capabilities failed: HTTP ${caps.status} ${JSON.stringify(caps.body)}`,
    );
  }

  const vwKey = await resolveVwKeyAsync();
  if (vwKey) {
    const status = await callApi({
      method: "GET",
      path: "/wallets/me/status",
      apiKey: vwKey,
    });
    if (!status.ok) {
      throw new Error(
        `wallet status failed: HTTP ${status.status} ${JSON.stringify(status.body)}`,
      );
    }
    console.log(
      JSON.stringify({ ok: true, capabilities: true, walletStatus: true }),
    );
    return;
  }

  console.log(
    JSON.stringify({
      ok: true,
      capabilities: true,
      walletStatus: "skipped (set RILL_VW_KEY to exercise)",
    }),
  );
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
