import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type RillConfig = {
  vwKey?: string;
  sellerKey?: string;
  ownerJwt?: string;
};

/** Resolve ~/.config/rill/config.json (or $XDG_CONFIG_HOME). */
export const configPath = (): string => {
  const base =
    process.env.XDG_CONFIG_HOME?.trim() || path.join(os.homedir(), ".config");
  return path.join(base, "rill", "config.json");
};

export const loadConfig = async (): Promise<RillConfig> => {
  try {
    const raw = await readFile(configPath(), "utf8");
    const parsed = JSON.parse(raw) as RillConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const saveConfig = async (patch: RillConfig): Promise<string> => {
  const file = configPath();
  await mkdir(path.dirname(file), { recursive: true });
  const current = await loadConfig();
  const next: RillConfig = { ...current, ...patch };
  await writeFile(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return file;
};
