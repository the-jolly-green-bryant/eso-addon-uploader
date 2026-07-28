import { NextRequest, NextResponse } from "next/server";

export const API = "https://api.bethesda.net/ugcmods/v2";
export const SESSION_COOKIE = "wayrest_bnet_session";

const appKey = () => process.env.BETHESDA_APP_KEY || "";

export function bethesdaHeaders(request?: NextRequest, authenticated = false) {
  const headers = new Headers({
    accept: "application/json",
    "content-type": "application/json",
    "user-agent": "wayrest-workshop/0.1.0",
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
    return JSON.parse(text);
  } catch {
    return { message: text || `Bethesda returned ${response.status}` };
  }
}

export function platformResponse(body: any) {
  return body?.platform?.response ?? body;
}

export function errorResponse(body: any, status = 502) {
  return NextResponse.json(
    { error: body?.platform?.message || body?.platform?.response?.message || body?.message || "Bethesda request failed." },
    { status },
  );
}

export function findJwt(value: unknown): string | null {
  if (typeof value === "string" && value.split(".").length === 3 && value.startsWith("eyJ")) return value;
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
