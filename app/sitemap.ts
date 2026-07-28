import type { MetadataRoute } from "next";
import { API, bethesdaHeaders, jsonFromBethesda, platformResponse } from "./api/bethesda/_client";

export const revalidate = 3600;

type CatalogPage = {
  data?: Array<{ content_id?: string; utime?: number; ptime?: number }>;
  page?: number;
  size?: number;
  total?: number;
};

async function catalogPage(page: number): Promise<CatalogPage> {
  const params = new URLSearchParams({
    product: "ESO",
    page: String(page),
    size: "50",
    sort: "utime",
    order: "desc",
    hardware_platforms: "WINDOWS,PLAYSTATION5,XBOXSERIESX",
    deleted: "false",
  });
  const response = await fetch(`${API}/content?${params}`, {
    headers: bethesdaHeaders(),
    next: { revalidate },
  });
  if (!response.ok) return {};
  return platformResponse(await jsonFromBethesda(response)) as CatalogPage;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = "https://eso-addon-uploader.bryantjames.com";
  const first = await catalogPage(1);
  const pageSize = first.size || 50;
  const pageCount = Math.max(1, Math.ceil((first.total || first.data?.length || 0) / pageSize));
  const remaining = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => catalogPage(index + 2)),
  );
  const addons = [first, ...remaining].flatMap((page) => page.data || []);

  return [
    {
      url: origin,
      changeFrequency: "daily",
      priority: 1,
    },
    ...addons.flatMap((addon) => addon.content_id ? [{
      url: `${origin}/addons/${addon.content_id}`,
      lastModified: new Date((addon.utime || addon.ptime || 0) * 1000),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }] : []),
  ];
}
