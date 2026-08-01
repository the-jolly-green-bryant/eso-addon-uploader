import { NextRequest, NextResponse } from "next/server";
import { queryCatalog } from "../../../../lib/catalog";
import { mirrorAddons } from "../../../../lib/mirror";

const boundedInteger = (
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const text = (params.get("text") || "").trim().toLocaleLowerCase();
  const category = (params.get("categories") || "all").toLocaleLowerCase();
  const requestedPlatform = params.get("platform");
  const platform =
    requestedPlatform === "console" || requestedPlatform === "pc-mac"
      ? requestedPlatform
      : "all";
  const page = boundedInteger(params.get("page"), 1, 1, 10_000);
  const size = boundedInteger(params.get("size"), 30, 1, 100);
  return NextResponse.json(
    queryCatalog(await mirrorAddons(), {
      text,
      category,
      platform,
      page,
      size,
    }),
  );
}
