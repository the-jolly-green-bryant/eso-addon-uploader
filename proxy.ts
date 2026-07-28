import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0];
  const { pathname } = request.nextUrl;

  if (
    host === "docs.eso-addon-uploader.bryantjames.com" &&
    pathname !== "/openapi.yaml" &&
    !pathname.startsWith("/docs")
  ) {
    const url = request.nextUrl.clone();
    if (pathname === "/robots.txt") url.pathname = "/docs/robots.txt";
    else if (pathname === "/sitemap.xml") url.pathname = "/docs/sitemap.xml";
    else url.pathname = pathname === "/" ? "/docs" : `/docs${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.svg|og.png).*)"],
};
