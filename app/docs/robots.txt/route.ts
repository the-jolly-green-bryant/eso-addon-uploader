export function GET() {
  return new Response(
    [
      "User-agent: *",
      "Allow: /",
      "Sitemap: https://docs.eso-addon-uploader.bryantjames.com/sitemap.xml",
      "",
    ].join("\n"),
    { headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}
