import { NextRequest, NextResponse } from "next/server";
import {
  API,
  bethesdaHeaders,
  hasTrustedOrigin,
  isUuid,
  jsonError,
  jsonFromBethesda,
  platformResponse,
  safeExternalHttpsUrl,
  SESSION_COOKIE,
  upstreamMessage,
  withTimeout,
} from "../_client";

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

function findUploadId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  for (const [key, item] of Object.entries(value)) {
    if (/^(upload_?id|id)$/i.test(key) && typeof item === "string") return item;
    const nested = findUploadId(item);
    if (nested) return nested;
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return jsonError("Cross-site upload requests are not allowed.", 403);
  if (!request.cookies.get(SESSION_COOKIE)) return jsonError("Sign in first.", 401);
  const form = await request.formData();
  const archive = form.get("archive");
  const addonId = String(form.get("addonId") || "").trim();
  if (!(archive instanceof File) || !isUuid(addonId)) return jsonError("A ZIP and valid addon ID are required.", 400);
  if (!archive.size || archive.size > 200 * 1024 * 1024) return jsonError("The ZIP must be between 1 byte and 200 MB.", 413);
  if (!archive.name.toLowerCase().endsWith(".zip")) return jsonError("The addon package must be a ZIP file.", 400);
  const version = String(form.get("version") || "1.0.0").trim().slice(0, 50);
  const note = String(form.get("note") || "").trim().slice(0, 2_000);

  const initiatePayload = {
    content_id: addonId,
    filename: archive.name,
    file_name: archive.name,
    file_size: archive.size,
    size: archive.size,
    content_type: "application/zip",
    hardware_platform: "WINDOWS",
    version_name: version || "1.0.0",
    note,
    parts: 1,
  };
  const initiated = await fetch(`${API}/upload/initiate`, {
    ...withTimeout(),
    method: "POST",
    headers: bethesdaHeaders(request, true),
    body: JSON.stringify(initiatePayload),
  });
  const initiatedBody = await jsonFromBethesda(initiated);
  if (!initiated.ok) {
    return NextResponse.json({
      error: upstreamMessage(initiatedBody, "Bethesda rejected upload initiation."),
      phase: "initiate",
    }, { status: initiated.status });
  }

  const upload = platformResponse(initiatedBody);
  const uploadUrl = safeExternalHttpsUrl(findUploadUrl(upload));
  const uploadId = findUploadId(upload);
  if (!uploadUrl || !uploadId) {
    return NextResponse.json({ error: "Bethesda initiated the upload but returned an unfamiliar response.", phase: "initiate-schema" }, { status: 502 });
  }
  const uploaded = await fetch(uploadUrl, withTimeout({
    method: "PUT",
    headers: { "content-type": "application/zip" },
    body: await archive.arrayBuffer(),
  }, 120_000));
  if (!uploaded.ok) return NextResponse.json({ error: "The binary storage upload failed.", phase: "binary" }, { status: uploaded.status });
  const etag = uploaded.headers.get("etag")?.replaceAll('"', "");
  if (!etag) return NextResponse.json({ error: "The binary storage upload did not return an ETag.", phase: "binary" }, { status: 502 });

  const completed = await fetch(`${API}/upload/complete`, {
    ...withTimeout(),
    method: "POST",
    headers: bethesdaHeaders(request, true),
    body: JSON.stringify({
      content_id: addonId,
      upload_id: uploadId,
      number_of_parts: 1,
      parts: [{ part_number: 1, etag }],
    }),
  });
  const completedBody = await jsonFromBethesda(completed);
  if (!completed.ok) return NextResponse.json({
    error: upstreamMessage(completedBody, "Bethesda could not finalize the package."),
    phase: "complete",
  }, { status: completed.status });
  return NextResponse.json(platformResponse(completedBody));
}
