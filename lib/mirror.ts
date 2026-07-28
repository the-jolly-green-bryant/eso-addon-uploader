import { isRecord, isUuid } from "./protocol";

const CATALOG_URL =
  "https://raw.githubusercontent.com/the-jolly-green-bryant/eso-addon-mirror/main/catalog.json";

export type MirrorAddon = {
  content_id: string;
  title: string;
  path: string;
  published?: boolean;
  deleted: true;
  deleted_at?: string;
  utime?: number;
  ptime?: number;
  source?: string;
};

export async function deletedMirrorAddons(): Promise<MirrorAddon[]> {
  try {
    const response = await fetch(CATALOG_URL, { next: { revalidate: 300 } });
    if (!response.ok) return [];
    const body = await response.json() as unknown;
    if (!isRecord(body) || !isRecord(body.addons)) return [];

    return Object.values(body.addons).flatMap((value) => {
      if (
        !isRecord(value) ||
        value.deleted !== true ||
        typeof value.content_id !== "string" ||
        !isUuid(value.content_id) ||
        typeof value.title !== "string" ||
        typeof value.path !== "string" ||
        !value.path.startsWith("addons/")
      ) return [];
      return [{
        content_id: value.content_id,
        title: value.title,
        path: value.path,
        published: value.published === true,
        deleted: true as const,
        deleted_at: typeof value.deleted_at === "string" ? value.deleted_at : undefined,
        source: typeof value.source === "string" ? value.source : undefined,
      }];
    });
  } catch {
    return [];
  }
}

export async function deletedMirrorAddon(id: string): Promise<MirrorAddon | null> {
  return (await deletedMirrorAddons()).find((addon) => addon.content_id === id) || null;
}
