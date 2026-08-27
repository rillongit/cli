import { loadConfig } from "./config.js";

export const getApiBaseUrl = (): string =>
  (process.env.RILL_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export const getAppBaseUrl = (): string =>
  (process.env.RILL_APP_URL ?? "https://userill.com").replace(/\/$/, "");

let cachedConfig: Awaited<ReturnType<typeof loadConfig>> | undefined;

async function config() {
  if (cachedConfig !== undefined) return cachedConfig;
  cachedConfig = await loadConfig();
  return cachedConfig;
}

/** VW key: flag → env → ~/.config/rill/config.json */
export const resolveVwKeyAsync = async (
  flagKey?: string,
): Promise<string | null> => {
  if (flagKey?.trim()) return flagKey.trim();
  const fromEnv =
    process.env.RILL_VW_KEY?.trim() || process.env.RILL_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const cfg = await config();
  return cfg.vwKey?.trim() || null;
};

export const resolveSellerKeyAsync = async (
  flagKey?: string,
): Promise<string | null> => {
  if (flagKey?.trim()) return flagKey.trim();
  const fromEnv = process.env.RILL_SELLER_KEY?.trim();
  if (fromEnv) return fromEnv;
  const cfg = await config();
  return cfg.sellerKey?.trim() || null;
};

export const resolveOwnerJwtAsync = async (
  flagJwt?: string,
): Promise<string | null> => {
  if (flagJwt?.trim()) return flagJwt.trim();
  const fromEnv = process.env.RILL_OWNER_JWT?.trim();
  if (fromEnv) return fromEnv;
  const cfg = await config();
  return cfg.ownerJwt?.trim() || null;
};
