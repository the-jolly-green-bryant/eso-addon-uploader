import { NextRequest, NextResponse } from "next/server";
import { isRecord, type JsonRecord, upstreamMessage } from "@/lib/protocol";

export {
  isRecord,
  isUuid,
  platformResponse,
  safeExternalHttpsUrl,
  upstreamMessage,
} from "@/lib/protocol";
export type { JsonRecord } from "@/lib/protocol";

export const API = "https://api.bethesda.net/ugcmods/v2";
export const SESSION_COOKIE = "wayrest_bnet_session";
export const UPSTREAM_TIMEOUT_MS = 20_000;
const appKey = () => process.env.BETHESDA_APP_KEY || "";

export function bethesdaHeaders(request?: NextRequest, authenticated = false) {
  const headers = new Headers({
    accept: "application/json",
    "content-type": "application/json",
    "user-agent": "eso-addon-workshop/0.1.0",
  });
  if (appKey()) headers.set("x-bnet-key", appKey());
  if (authenticated) {
    const session = request?.cookies.get(SESSION_COOKIE)?.value;
    if (session) headers.set("x-session-token", session);
  }
  return headers;
}

export async function jsonFromBethesda(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text || `Bethesda returned ${response.status}` };
  }
}

export function errorResponse(body: unknown, status = 502) {
  return NextResponse.json({ error: upstreamMessage(body) }, { status });
}

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function readJsonObject(
  request: NextRequest,
  maxBytes = 32_768,
): Promise<JsonRecord | null> {
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > maxBytes) return null;
  if (!request.body) return null;
  try {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const value = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

export function requiredString(
  input: JsonRecord,
  key: string,
  { maxLength, minLength = 1 }: { maxLength: number; minLength?: number },
): string | null {
  const value = input[key];
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength)
    return null;
  return normalized;
}

export function optionalString(
  input: JsonRecord,
  key: string,
  maxLength: number,
): string {
  const value = input[key];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function hasTrustedOrigin(request: NextRequest): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const requestHost =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    return Boolean(requestHost && originHost === requestHost);
  } catch {
    return false;
  }
}

export function withTimeout(
  init: RequestInit = {},
  timeoutMs = UPSTREAM_TIMEOUT_MS,
): RequestInit {
  return { ...init, signal: init.signal ?? AbortSignal.timeout(timeoutMs) };
}

export async function readResponseBytes(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array> {
  if (!response.ok)
    throw new Error(`Upstream file returned ${response.status}`);
  const declaredLength = Number(response.headers.get("content-length") || "0");
  if (declaredLength > maxBytes)
    throw new Error("Upstream file exceeds the download limit");
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Upstream file exceeds the download limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function findJwt(value: unknown): string | null {
  if (
    typeof value === "string" &&
    value.split(".").length === 3 &&
    value.startsWith("eyJ")
  )
    return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findJwt(item);
      if (result) return result;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const result = findJwt(item);
      if (result) return result;
    }
  }
  return null;
}

export const hasAppKey = () => Boolean(appKey());
