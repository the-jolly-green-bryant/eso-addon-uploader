import { NextRequest, NextResponse } from "next/server";
import { API, bethesdaHeaders, hasAppKey, jsonFromBethesda, platformResponse } from "../_client";

export async function GET(request: NextRequest) {
  if (!hasAppKey()) return NextResponse.json({ data: [], preview: true });
  const incoming = request.nextUrl.searchParams;
  const params = new URLSearchParams({
    product: "ESO",
    page: incoming.get("page") || "1",
    size: incoming.get("size") || "30",
    sort: incoming.get("sort") || "utime",
    order: incoming.get("order") || "desc",
    hardware_platforms: incoming.get("hardware_platforms") || "WINDOWS,PLAYSTATION5,XBOXSERIESX",
    deleted: "false",
  });
  for (const key of ["text", "categories", "author_displayname"]) {
    if (incoming.get(key)) params.set(key, incoming.get(key)!);
  }
  const response = await fetch(`${API}/content?${params}`, {
    headers: bethesdaHeaders(),
    cache: "no-store",
  });
  const body = await jsonFromBethesda(response);
  if (!response.ok) return NextResponse.json({ data: [], upstream: response.status }, { status: response.status });
  return NextResponse.json(platformResponse(body));
}
