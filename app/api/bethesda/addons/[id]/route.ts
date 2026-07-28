import { NextRequest, NextResponse } from "next/server";
import { API, bethesdaHeaders, errorResponse, jsonFromBethesda, platformResponse, SESSION_COOKIE } from "../../_client";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!request.cookies.get(SESSION_COOKIE)) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const input = await request.json();
  const response = await fetch(`${API}/content/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: bethesdaHeaders(request, true),
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      overview: input.overview,
      categories: [input.category || "User Interface"],
    }),
  });
  const body = await jsonFromBethesda(response);
  if (!response.ok) return errorResponse(body, response.status);
  return NextResponse.json(platformResponse(body));
}
