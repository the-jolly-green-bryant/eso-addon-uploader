import { NextRequest, NextResponse } from "next/server";
import { API, bethesdaHeaders, jsonFromBethesda, platformResponse, SESSION_COOKIE } from "../_client";

function findUploadUrl(value: unknown): string | null {
  if (typeof value === "string" && /^https:\/\//.test(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findUploadUrl(item);
      if (url) return url;
    }
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (/url/i.test(key)) {
        const url = findUploadUrl(item);
        if (url) return url;
      }
    }
  }
  return null;
}

function findUploadId(value: any): string | null {
  if (!value || typeof value !== "object") return null;
  for (const [key, item] of Object.entries(value)) {
    if (/^(upload_?id|id)$/i.test(key) && typeof item === "string") return item;
    const nested = findUploadId(item);
    if (nested) return nested;
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const form = await request.formData();
  const archive = form.get("archive");
  const addonId = String(form.get("addonId") || "");
  if (!(archive instanceof File) || !addonId) return NextResponse.json({ error: "A ZIP and addon ID are required." }, { status: 400 });
  if (archive.size > 200 * 1024 * 1024) return NextResponse.json({ error: "Bethesda limits packages to 200 MB." }, { status: 413 });

  const initiatePayload = {
    content_id: addonId,
    filename: archive.name,
    file_name: archive.name,
    file_size: archive.size,
    size: archive.size,
    content_type: archive.type || "application/zip",
    hardware_platform: "WINDOWS",
    version_name: String(form.get("version") || "1.0.0"),
    note: String(form.get("note") || ""),
    parts: 1,
  };
  const initiated = await fetch(`${API}/upload/initiate`, {
    method: "POST",
    headers: bethesdaHeaders(request, true),
    body: JSON.stringify(initiatePayload),
  });
  const initiatedBody = await jsonFromBethesda(initiated);
  if (!initiated.ok) {
    return NextResponse.json({
      error: initiatedBody?.platform?.message || initiatedBody?.platform?.response?.message || "Bethesda rejected upload initiation.",
      phase: "initiate",
    }, { status: initiated.status });
  }

  const upload = platformResponse(initiatedBody);
  const uploadUrl = findUploadUrl(upload);
  const uploadId = findUploadId(upload);
  if (!uploadUrl || !uploadId) {
    return NextResponse.json({ error: "Bethesda initiated the upload but returned an unfamiliar response.", phase: "initiate-schema" }, { status: 502 });
  }
  const uploaded = await fetch(uploadUrl, { method: "PUT", body: await archive.arrayBuffer() });
  if (!uploaded.ok) return NextResponse.json({ error: "The binary storage upload failed.", phase: "binary" }, { status: uploaded.status });

  const completed = await fetch(`${API}/upload/complete`, {
    method: "POST",
    headers: bethesdaHeaders(request, true),
    body: JSON.stringify({
      content_id: addonId,
      upload_id: uploadId,
      number_of_parts: 1,
      parts: [{ part_number: 1, etag: uploaded.headers.get("etag")?.replaceAll('"', "") }],
    }),
  });
  const completedBody = await jsonFromBethesda(completed);
  if (!completed.ok) return NextResponse.json({
    error: completedBody?.platform?.message || completedBody?.platform?.response?.message || "Bethesda could not finalize the package.",
    phase: "complete",
  }, { status: completed.status });
  return NextResponse.json(platformResponse(completedBody));
}
