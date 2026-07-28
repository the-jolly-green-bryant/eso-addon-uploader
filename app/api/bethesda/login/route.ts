import { NextRequest, NextResponse } from "next/server";
import {
  findJwt,
  hasAppKey,
  hasTrustedOrigin,
  jsonError,
  jsonFromBethesda,
  readJsonObject,
  requiredString,
  SESSION_COOKIE,
  upstreamMessage,
  withTimeout,
} from "../_client";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return jsonError("Cross-site login requests are not allowed.", 403);
  if (!hasAppKey()) {
    return jsonError("Bethesda application key is not configured yet.", 503);
  }
  const input = await readJsonObject(request, 8_192);
  if (!input) return jsonError("A valid JSON request body is required.", 400);
  const username = requiredString(input, "username", { maxLength: 100 });
  const password = requiredString(input, "password", { maxLength: 1_024 });
  if (!username || !password) return jsonError("Username and password are required.", 400);
  const response = await fetch("https://api.bethesda.net/session/login", {
    ...withTimeout(),
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "wayrest-workshop/0.1.0",
      "x-bnet-key": process.env.BETHESDA_APP_KEY!,
    },
    body: JSON.stringify({ username, password, language: "en" }),
  });
  const body = await jsonFromBethesda(response);
  const token = findJwt(body);
  if (!response.ok || !token) {
    return jsonError(upstreamMessage(body, "Bethesda rejected the login."), response.status || 401);
  }
  const result = NextResponse.json({ username }, { headers: { "cache-control": "no-store" } });
  result.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  return result;
}
