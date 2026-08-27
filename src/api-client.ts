import { getApiBaseUrl } from "./env.js";
import { CLI_USER_AGENT } from "./package-meta.js";

export type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  body: T;
};

type CallOptions = {
  apiKey?: string | null;
  method: string;
  path: string;
  body?: unknown;
  timeoutMs?: number;
  idempotencyKey?: string;
  /** Owner JWT money mode. VW/seller keys own their environment via key prefix. */
  environment?: "live" | "test" | string | null;
};

const RILL_ENVIRONMENT_HEADER = "X-Rill-Environment";

function fetchTimeoutMs(): number {
  const n = Number(process.env.RILL_API_FETCH_TIMEOUT_MS ?? "60000");
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

function resolveCallEnvironment(
  explicit?: "live" | "test" | string | null,
): "live" | "test" {
  const raw = (
    explicit ??
    process.env.RILL_ENVIRONMENT ??
    process.env.RILL_MONEY_ENVIRONMENT ??
    "live"
  )
    .toString()
    .trim()
    .toLowerCase();
  return raw === "test" ? "test" : "live";
}

/** Thin JSON fetch wrapper for the Rill REST API. */
export const callApi = async <T = unknown>(
  options: CallOptions,
): Promise<ApiResult<T>> => {
  const base = getApiBaseUrl();
  const path = options.path.startsWith("/") ? options.path : `/${options.path}`;
  const url = `${base}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": CLI_USER_AGENT,
    [RILL_ENVIRONMENT_HEADER]: resolveCallEnvironment(options.environment),
  };
  if (options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`;
  }
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? fetchTimeoutMs(),
  );
  try {
    const res = await fetch(url, {
      method: options.method,
      headers,
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* plain text */
    }
    return { ok: res.ok, status: res.status, body: parsed as T };
  } finally {
    clearTimeout(timer);
  }
};
