import { NextRequest, NextResponse } from "next/server";
import { API, bethesdaHeaders, errorResponse, jsonFromBethesda, platformResponse, SESSION_COOKIE } from "../_client";

export async function POST(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const input = await request.json();
  const payload = {
    title: input.title,
    description: input.description,
    overview: input.overview,
    product: "ESO",
    content_type: "STANDARD",
    hardware_platforms: ["WINDOWS", "PLAYSTATION5", "XBOXSERIESX"],
    categories: [input.category || "User Interface"],
    default_locale: "EN",
    supported_locales: ["EN"],
  };
  const response = await fetch(`${API}/content`, {
    method: "POST",
    headers: bethesdaHeaders(request, true),
    body: JSON.stringify(payload),
  });
  const body = await jsonFromBethesda(response);
  if (!response.ok) return errorResponse(body, response.status);
  return NextResponse.json(platformResponse(body), { status: 201 });
}
