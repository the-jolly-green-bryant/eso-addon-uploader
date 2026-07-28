import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/addons/"],
      disallow: ["/api/", "/my-addons", "/docs"],
    },
    sitemap: "https://eso-addon-uploader.bryantjames.com/sitemap.xml",
    host: "https://eso-addon-uploader.bryantjames.com",
  };
}
