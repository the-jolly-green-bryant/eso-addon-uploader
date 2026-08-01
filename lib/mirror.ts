import { isRecord } from "./protocol";

const CATALOG_URL =
  "https://raw.githubusercontent.com/the-jolly-green-bryant/eso-addon-mirror/refs/heads/main/catalog-index.json";

export type MirrorAddon = {
  content_id: string;
  canonical_id: string;
  title: string;
  overview?: string;
  author_displayname?: string;
  categories?: string[];
  hardware_platforms?: string[];
  published?: boolean;
  deleted?: boolean;
  deleted_at?: string;
  source: "bethesda" | "esoui";
  source_url?: string;
  download_url?: string;
  image_url?: string;
  archive_repository?: string;
  archive_path?: string;
  path?: string;
  archived?: boolean;
  version?: string;
  utime?: number;
  ptime?: number;
  stats?: { totals?: { downloads?: number; subscribes?: number } };
};

function normalize(value: unknown): MirrorAddon | null {
  if (
    !isRecord(value) ||
    typeof value.canonical_id !== "string" ||
    typeof value.content_id !== "string" ||
    typeof value.title !== "string" ||
    (value.source !== "bethesda" && value.source !== "esoui")
  )
    return null;

  const stats = isRecord(value.stats) ? value.stats : {};
  const downloads =
    typeof stats.downloads === "number" ? stats.downloads : undefined;
  return {
    content_id: value.content_id,
    canonical_id: value.canonical_id,
    title: value.title,
    overview:
      value.source === "esoui"
        ? `PC addon from ESOUI${typeof value.version === "string" ? ` · version ${value.version}` : ""}.`
        : "Console addon preserved from the Bethesda catalog.",
    author_displayname:
      typeof value.author === "string" ? value.author : undefined,
    categories: [value.source === "esoui" ? "PC Addon" : "Console Addon"],
    hardware_platforms: [value.source === "esoui" ? "WINDOWS" : "CONSOLE"],
    published: value.published === true,
    deleted: value.deleted === true,
    deleted_at:
      typeof value.deleted_at === "string" ? value.deleted_at : undefined,
    source: value.source,
    source_url:
      typeof value.source_url === "string" ? value.source_url : undefined,
    download_url:
      typeof value.download_url === "string" ? value.download_url : undefined,
    image_url:
      typeof value.image_url === "string" ? value.image_url : undefined,
    archive_repository:
      typeof value.archive_repository === "string"
        ? value.archive_repository
        : undefined,
    archive_path:
      typeof value.archive_path === "string" ? value.archive_path : undefined,
    path:
      typeof value.archive_path === "string" ? value.archive_path : undefined,
    archived: value.archived === true,
    version: typeof value.version === "string" ? value.version : undefined,
    utime: typeof value.updated_at === "number" ? value.updated_at : undefined,
    stats: { totals: { downloads } },
  };
}

export async function mirrorAddons(): Promise<MirrorAddon[]> {
  try {
    const response = await fetch(CATALOG_URL, { next: { revalidate: 300 } });
    if (!response.ok) return [];
    const body = (await response.json()) as unknown;
    if (!isRecord(body) || !isRecord(body.addons)) return [];
    return Object.values(body.addons).flatMap((value) => {
      const addon = normalize(value);
      return addon ? [addon] : [];
    });
  } catch {
    return [];
  }
}

export async function mirrorAddon(id: string): Promise<MirrorAddon | null> {
  const canonicalId = id.includes(":") ? id : `bethesda:${id}`;
  return (
    (await mirrorAddons()).find(
      (addon) => addon.canonical_id === canonicalId || addon.content_id === id,
    ) || null
  );
}

export async function deletedMirrorAddons(): Promise<MirrorAddon[]> {
  return (await mirrorAddons()).filter((addon) => addon.deleted);
}

export async function deletedMirrorAddon(id: string) {
  const addon = await mirrorAddon(id);
  return addon?.deleted ? addon : null;
}
