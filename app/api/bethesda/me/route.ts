import { NextRequest, NextResponse } from "next/server";
import {
  API,
  bethesdaHeaders,
  jsonError,
  jsonFromBethesda,
  platformResponse,
  SESSION_COOKIE,
  withTimeout,
} from "../_client";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return jsonError("Not signed in.", 401);
  const response = await fetch(
    `${API}/content/me?sort=utime&order=desc&page=1&size=100&deleted=false`,
    {
      ...withTimeout(),
      headers: bethesdaHeaders(request, true),
      cache: "no-store",
    },
  );
  const body = await jsonFromBethesda(response);
  if (!response.ok)
    return NextResponse.json(
      { error: "Bethesda session expired." },
      { status: response.status },
    );
  const data = platformResponse(body);
  let username = "Bethesda author";
  try {
    const token = sessionCookie.split(".")[1];
    const payload = JSON.parse(Buffer.from(token, "base64url").toString());
    if (typeof payload.username === "string") username = payload.username;
    else if (typeof payload.login_username === "string")
      username = payload.login_username;
  } catch {
    // The upstream token shape is not guaranteed; the generic label is safe.
  }
  const responseData = typeof data === "object" && data !== null ? data : {};
  return NextResponse.json(
    { username, ...responseData },
    { headers: { "cache-control": "no-store" } },
  );
}
