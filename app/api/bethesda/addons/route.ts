import { NextRequest, NextResponse } from "next/server";
import {
  API,
  bethesdaHeaders,
  errorResponse,
  hasTrustedOrigin,
  jsonError,
  jsonFromBethesda,
  optionalString,
  platformResponse,
  readJsonObject,
  requiredString,
  SESSION_COOKIE,
  withTimeout,
} from "../_client";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request))
    return jsonError("Cross-site addon requests are not allowed.", 403);
  if (!request.cookies.get(SESSION_COOKIE))
    return jsonError("Sign in first.", 401);
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
  const payload = {
    title,
    description,
    overview,
    product: "ESO",
    content_type: "STANDARD",
    hardware_platforms: ["WINDOWS", "PLAYSTATION5", "XBOXSERIESX"],
    categories: [optionalString(input, "category", 80) || "User Interface"],
    default_locale: "EN",
    supported_locales: ["EN"],
  };
  const response = await fetch(`${API}/content`, {
    ...withTimeout(),
    method: "POST",
    headers: bethesdaHeaders(request, true),
    body: JSON.stringify(payload),
  });
  const body = await jsonFromBethesda(response);
  if (!response.ok) return errorResponse(body, response.status);
  return NextResponse.json(platformResponse(body), { status: 201 });
}
