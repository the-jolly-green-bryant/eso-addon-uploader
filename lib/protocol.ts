export type JsonRecord = Record<string, unknown>;

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function platformResponse<T = unknown>(body: unknown): T {
  if (!isRecord(body)) return body as T;
  const platform = body.platform;
  if (!isRecord(platform) || platform.response === undefined) return body as T;
  return platform.response as T;
}

export function upstreamMessage(body: unknown, fallback = "Bethesda request failed."): string {
  if (!isRecord(body)) return fallback;
  const platform = isRecord(body.platform) ? body.platform : undefined;
  const response = platform && isRecord(platform.response) ? platform.response : undefined;
  for (const value of [platform?.message, response?.message, body.message]) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

export function safeExternalHttpsUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
      hostname === "::1" ||
      hostname.startsWith("[")
    ) return null;
    return url;
  } catch {
    return null;
  }
}
