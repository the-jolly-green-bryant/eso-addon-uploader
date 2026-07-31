import { NextRequest, NextResponse } from "next/server";
import {
  API,
  bethesdaHeaders,
  errorResponse,
  hasTrustedOrigin,
  isUuid,
  jsonError,
  jsonFromBethesda,
  optionalString,
  platformResponse,
  readJsonObject,
  requiredString,
  SESSION_COOKIE,
  withTimeout,
} from "../../_client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("A valid addon ID is required.", 400);
  const response = await fetch(`${API}/content/${encodeURIComponent(id)}`, {
    ...withTimeout(),
    headers: bethesdaHeaders(),
    cache: "no-store",
  });
  const body = await jsonFromBethesda(response);
  if (!response.ok) return errorResponse(body, response.status);
  return NextResponse.json(platformResponse(body));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasTrustedOrigin(request))
    return jsonError("Cross-site addon requests are not allowed.", 403);
  if (!request.cookies.get(SESSION_COOKIE))
    return jsonError("Sign in first.", 401);
  const { id } = await params;
  if (!isUuid(id)) return jsonError("A valid addon ID is required.", 400);
  const input = await readJsonObject(request, 128 * 1024);
  if (!input) return jsonError("A valid JSON request body is required.", 400);
  const title = requiredString(input, "title", { maxLength: 120 });
  const overview = requiredString(input, "overview", { maxLength: 180 });
  const description = requiredString(input, "description", {
    maxLength: 100_000,
  });
  if (!title || !overview || !description) {
    return jsonError(
      "Title, overview, and description are required and must fit their length limits.",
      400,
    );
  }
  const response = await fetch(`${API}/content/${encodeURIComponent(id)}`, {
    ...withTimeout(),
    method: "PUT",
    headers: bethesdaHeaders(request, true),
    body: JSON.stringify({
      title,
      description,
      overview,
      categories: [optionalString(input, "category", 80) || "User Interface"],
    }),
  });
  const body = await jsonFromBethesda(response);
  if (!response.ok) return errorResponse(body, response.status);
  return NextResponse.json(platformResponse(body));
}
