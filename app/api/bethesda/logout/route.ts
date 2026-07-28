import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "../_client";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && process.env.BETHESDA_APP_KEY) {
    await fetch("https://api.bethesda.net/session/logout", {
      method: "POST",
      headers: {
        "x-bnet-key": process.env.BETHESDA_APP_KEY,
        "x-session-token": token,
        "user-agent": "wayrest-workshop/0.1.0",
      },
    }).catch(() => undefined);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
