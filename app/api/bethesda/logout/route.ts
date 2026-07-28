import { NextRequest, NextResponse } from "next/server";
import { hasTrustedOrigin, jsonError, SESSION_COOKIE, withTimeout } from "../_client";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return jsonError("Cross-site logout requests are not allowed.", 403);
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && process.env.BETHESDA_APP_KEY) {
    await fetch("https://api.bethesda.net/session/logout", {
      ...withTimeout(),
      method: "POST",
      headers: {
        "x-bnet-key": process.env.BETHESDA_APP_KEY,
        "x-session-token": token,
        "user-agent": "wayrest-workshop/0.1.0",
      },
    }).catch(() => undefined);
  }
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
