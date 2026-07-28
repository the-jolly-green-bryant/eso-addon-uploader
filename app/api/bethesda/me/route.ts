import { NextRequest, NextResponse } from "next/server";
import { API, bethesdaHeaders, jsonFromBethesda, platformResponse, SESSION_COOKIE } from "../_client";

export async function GET(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const response = await fetch(`${API}/content/me?sort=utime&order=desc&page=1&size=100&deleted=false`, {
    headers: bethesdaHeaders(request, true),
    cache: "no-store",
  });
  const body = await jsonFromBethesda(response);
  if (!response.ok) return NextResponse.json({ error: "Bethesda session expired." }, { status: response.status });
  const data = platformResponse(body);
  let username = "Bethesda author";
  try {
    const token = request.cookies.get(SESSION_COOKIE)!.value.split(".")[1];
    const payload = JSON.parse(Buffer.from(token, "base64url").toString());
    username = payload.username || payload.login_username || username;
  } catch {}
  return NextResponse.json({ username, ...data });
}
