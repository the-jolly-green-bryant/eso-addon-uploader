const urls = [
  "https://docs.eso-addon-uploader.bryantjames.com/",
  "https://docs.eso-addon-uploader.bryantjames.com/openapi.yaml",
];

export function GET() {
  const entries = urls.map((url) => `<url><loc>${url}</loc></url>`).join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`,
    { headers: { "content-type": "application/xml; charset=utf-8" } },
  );
}
