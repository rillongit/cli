/** Extract a human-readable error string from a Rill API JSON body. */
export const apiError = (body: unknown, fallback = "Request failed"): string => {
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;

  if (typeof o.error === "string") return o.error;

  if (
    o.error &&
    typeof o.error === "object" &&
    typeof (o.error as { message?: unknown }).message === "string"
  ) {
    return (o.error as { message: string }).message;
  }

  if (typeof o.message === "string") return o.message;
  return fallback;
};
