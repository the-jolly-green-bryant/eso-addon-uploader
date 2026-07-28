import { NextRequest, NextResponse } from "next/server";
import { API, bethesdaHeaders, hasAppKey, jsonFromBethesda, platformResponse, withTimeout } from "../_client";
import { deletedMirrorAddons } from "../../../../lib/mirror";

const allowedSortFields = new Set(["ctime", "ptime", "title", "utime"]);
const allowedPlatforms = new Set(["PLAYSTATION5", "WINDOWS", "XBOXSERIESX"]);

function boundedInteger(value: string | null, fallback: number, minimum: number, maximum: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

export async function GET(request: NextRequest) {
  if (!hasAppKey()) return NextResponse.json({ data: [], preview: true });
  const incoming = request.nextUrl.searchParams;
  const sort = incoming.get("sort") || "utime";
  const order = incoming.get("order") === "asc" ? "asc" : "desc";
  const requestedPlatforms = (incoming.get("hardware_platforms") || "WINDOWS,PLAYSTATION5,XBOXSERIESX")
    .split(",")
    .filter((platform) => allowedPlatforms.has(platform));
  const params = new URLSearchParams({
    product: "ESO",
    page: String(boundedInteger(incoming.get("page"), 1, 1, 10_000)),
    size: String(boundedInteger(incoming.get("size"), 30, 1, 100)),
    sort: allowedSortFields.has(sort) ? sort : "utime",
    order,
    hardware_platforms: (requestedPlatforms.length ? requestedPlatforms : [...allowedPlatforms]).join(","),
    deleted: "false",
  });
  for (const key of ["text", "categories", "author_displayname"]) {
    const value = incoming.get(key)?.trim();
    if (value) params.set(key, value.slice(0, 200));
  }
  const [response, archived] = await Promise.all([
    fetch(`${API}/content?${params}`, {
      ...withTimeout(),
      headers: bethesdaHeaders(),
      cache: "no-store",
    }),
    deletedMirrorAddons(),
  ]);
  const body = await jsonFromBethesda(response);
  if (!response.ok) return NextResponse.json({ data: [], upstream: response.status }, { status: response.status });

  const catalog = platformResponse<{ data?: unknown[]; total?: number }>(body);
  const text = (incoming.get("text") || "").trim().toLocaleLowerCase();
  const category = (incoming.get("categories") || "").trim().toLocaleLowerCase();
  const archivedMatches = archived.filter((addon) =>
    (!text || addon.title.toLocaleLowerCase().includes(text)) &&
    (!category || category === "all"),
  );
  return NextResponse.json({
    ...catalog,
    data: [...(Array.isArray(catalog.data) ? catalog.data : []), ...archivedMatches],
    total: (typeof catalog.total === "number" ? catalog.total : 0) + archivedMatches.length,
  });
}
