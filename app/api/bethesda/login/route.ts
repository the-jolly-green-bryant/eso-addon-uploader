import { NextRequest, NextResponse } from "next/server";
import { findJwt, hasAppKey, jsonFromBethesda, SESSION_COOKIE } from "../_client";

export async function POST(request: NextRequest) {
  if (!hasAppKey()) {
    return NextResponse.json({ error: "Bethesda application key is not configured yet." }, { status: 503 });
  }
  const { username, password } = await request.json();
  if (!username || !password) return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  const response = await fetch("https://api.bethesda.net/session/login", {
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
    return NextResponse.json({ error: body?.platform?.message || "Bethesda rejected the login." }, { status: response.status || 401 });
  }
  const result = NextResponse.json({ username });
  result.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  return result;
}
