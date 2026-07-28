import { NextRequest, NextResponse } from "next/server";
import { zipSync } from "fflate";
import {
  API,
  bethesdaHeaders,
  isRecord,
  isUuid,
  jsonError,
  jsonFromBethesda,
  platformResponse,
  readResponseBytes,
  safeExternalHttpsUrl,
  withTimeout,
} from "../_client";
import { deletedMirrorAddon, type MirrorAddon } from "../../../../lib/mirror";

const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const MAX_FILES = 2_000;

type ClientFile = {
  download_url: string;
  size?: number;
};

type GitHubEntry = {
  type?: string;
  path?: string;
  size?: number;
  download_url?: string | null;
};

async function archivedZip(addon: MirrorAddon): Promise<NextResponse | null> {
  const queue = [addon.path];
  const entries: GitHubEntry[] = [];
  while (queue.length) {
    const path = queue.shift();
    if (!path || queue.length + entries.length > MAX_FILES) return null;
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(
      `https://api.github.com/repos/the-jolly-green-bryant/eso-addon-mirror/contents/${encodedPath}?ref=main`,
      { ...withTimeout(), headers: { accept: "application/vnd.github+json", "user-agent": "wayrest-workshop/0.1.0" } },
    );
    if (!response.ok) return null;
    const body = await response.json() as unknown;
    if (!Array.isArray(body)) return null;
    for (const value of body) {
      if (!isRecord(value)) continue;
      const entry = value as GitHubEntry;
      if (entry.type === "dir" && typeof entry.path === "string") queue.push(entry.path);
      if (entry.type === "file") entries.push(entry);
    }
  }

  const files: Record<string, Uint8Array> = {};
  let totalBytes = 0;
  for (const entry of entries) {
    if (typeof entry.path !== "string" || !entry.path.startsWith(`${addon.path}/`)) return null;
    const archivePath = entry.path.slice(addon.path.length + 1);
    if (!isSafeArchivePath(archivePath)) return null;
    const url = safeExternalHttpsUrl(entry.download_url);
    if (!url || url.hostname !== "raw.githubusercontent.com") return null;
    if ((entry.size || 0) > MAX_FILE_BYTES || totalBytes + (entry.size || 0) > MAX_TOTAL_BYTES) return null;
    const bytes = await readResponseBytes(await fetch(url, withTimeout()), Math.min(MAX_FILE_BYTES, MAX_TOTAL_BYTES - totalBytes));
    totalBytes += bytes.byteLength;
    files[archivePath] = bytes;
  }
  if (!Object.keys(files).length) return null;

  const safeTitle = addon.title.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "eso-addon";
  return new NextResponse(zipSync(files, { level: 6 }), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${safeTitle}-archived.zip"`,
      "cache-control": "public, max-age=300",
      "x-content-type-options": "nosniff",
      "x-archive-source": "eso-addon-mirror",
    },
  });
}

function isSafeArchivePath(value: string): boolean {
  if (!value || value.length > 512 || value.includes("\0") || value.startsWith("/") || value.startsWith("\\")) return false;
  const parts = value.replaceAll("\\", "/").split("/");
  return parts.every((part) => part && part !== "." && part !== "..");
}

function clientEntries(body: unknown): { releaseVersion: string; entries: Record<string, ClientFile> } | null {
  if (!isRecord(body) || !Array.isArray(body.download)) return null;
  const windows = body.download.find(
    (entry) => isRecord(entry) && entry.hardware_platform === "WINDOWS",
  );
  if (!isRecord(windows) || !Array.isArray(windows.published) || !isRecord(windows.published[0])) return null;
  const release = windows.published[0];
  if (!isRecord(release.client)) return null;

  const entries: Record<string, ClientFile> = {};
  for (const [key, value] of Object.entries(release.client)) {
    if (!isRecord(value) || typeof value.download_url !== "string") continue;
    entries[key] = {
      download_url: value.download_url,
      size: typeof value.size === "number" ? value.size : undefined,
    };
  }
  return {
    releaseVersion: typeof release.version_name === "string" ? release.version_name : "latest",
    entries,
  };
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!isUuid(id)) return jsonError("A valid addon ID is required.", 400);

  try {
    const [response, archived] = await Promise.all([
      fetch(`${API}/content/${encodeURIComponent(id)}`, {
        ...withTimeout(),
        headers: bethesdaHeaders(),
      }),
      deletedMirrorAddon(id),
    ]);
    const body = platformResponse(await jsonFromBethesda(response));
    if (!response.ok) {
      const fallback = archived && await archivedZip(archived);
      return fallback || jsonError("Addon could not be loaded from Bethesda or the public mirror.", response.status);
    }

    const release = clientEntries(body);
    if (!release) {
      const fallback = archived && await archivedZip(archived);
      return fallback || jsonError("No downloadable Windows release is available.", 404);
    }
    const manifest = Object.values(release.entries).find((file) => file.download_url.includes("manifest"));
    const manifestUrl = safeExternalHttpsUrl(manifest?.download_url);
    if (!manifestUrl) return jsonError("The release manifest URL is invalid.", 502);

    const manifestResponse = await fetch(manifestUrl, withTimeout());
    const manifestBytes = await readResponseBytes(manifestResponse, MAX_MANIFEST_BYTES);
    const parsedManifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as unknown;
    if (!isRecord(parsedManifest)) return jsonError("The release manifest has an invalid shape.", 502);

    const manifestEntries = Object.entries(parsedManifest);
    if (manifestEntries.length > MAX_FILES) return jsonError("The release contains too many files.", 413);

    const files: Record<string, Uint8Array> = {};
    let totalBytes = 0;
    for (const [key, pathValue] of manifestEntries) {
      if (typeof pathValue !== "string" || !isSafeArchivePath(pathValue)) {
        return jsonError("The release manifest contains an unsafe file path.", 502);
      }
      const file = release.entries[key];
      const fileUrl = safeExternalHttpsUrl(file?.download_url);
      if (!fileUrl) return jsonError("The release manifest references an invalid file URL.", 502);
      if (file.size && (file.size > MAX_FILE_BYTES || totalBytes + file.size > MAX_TOTAL_BYTES)) {
        return jsonError("The release exceeds the safe reconstruction limit.", 413);
      }
      const remaining = Math.min(MAX_FILE_BYTES, MAX_TOTAL_BYTES - totalBytes);
      if (remaining <= 0) return jsonError("The release exceeds the safe reconstruction limit.", 413);
      const bytes = await readResponseBytes(await fetch(fileUrl, withTimeout()), remaining);
      totalBytes += bytes.byteLength;
      files[pathValue.replaceAll("\\", "/")] = bytes;
    }

    const zip = zipSync(files, { level: 6 });
    const title = isRecord(body) && typeof body.title === "string" ? body.title : "eso-addon";
    const safeTitle = title.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "eso-addon";
    const safeVersion = release.releaseVersion.replace(/[^a-z0-9._-]+/gi, "-").slice(0, 50) || "latest";
    return new NextResponse(zip, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${safeTitle}-${safeVersion}.zip"`,
        "cache-control": "private, max-age=300",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "Bethesda timed out while preparing the download."
      : "The addon archive could not be reconstructed safely.";
    return jsonError(message, 502);
  }
}
