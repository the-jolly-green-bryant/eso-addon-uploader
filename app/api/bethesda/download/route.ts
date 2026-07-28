import { NextRequest, NextResponse } from "next/server";
import { zipSync } from "fflate";
import { API, bethesdaHeaders, jsonFromBethesda, platformResponse } from "../_client";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Addon ID is required." }, { status: 400 });
  const response = await fetch(`${API}/content/${encodeURIComponent(id)}`, { headers: bethesdaHeaders() });
  const body = platformResponse(await jsonFromBethesda(response));
  if (!response.ok) return NextResponse.json({ error: "Addon could not be loaded." }, { status: response.status });
  const release = body.download?.find((entry: any) => entry.hardware_platform === "WINDOWS")?.published?.[0];
  const entries = release?.client || {};
  const manifest = Object.values(entries).find((file: any) => file.download_url?.includes("manifest")) as any;
  if (!manifest) return NextResponse.json({ error: "No downloadable release is available." }, { status: 404 });
  const manifestMap = await fetch(manifest.download_url).then((result) => result.json()) as Record<string, string>;
  const files: Record<string, Uint8Array> = {};
  await Promise.all(Object.entries(manifestMap).map(async ([key, path]) => {
    const file = entries[key];
    if (!file?.download_url) return;
    const bytes = await fetch(file.download_url).then((result) => result.arrayBuffer());
    files[path] = new Uint8Array(bytes);
  }));
  const zip = zipSync(files, { level: 6 });
  const safeTitle = String(body.title || "eso-addon").replace(/[^a-z0-9_-]+/gi, "-");
  return new NextResponse(zip, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${safeTitle}-${release.version_name}.zip"`,
      "cache-control": "private, max-age=300",
    },
  });
}
