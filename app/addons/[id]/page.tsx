import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  API,
  bethesdaHeaders,
  isUuid,
  jsonFromBethesda,
  platformResponse,
  withTimeout,
} from "../../api/bethesda/_client";
import { decodeHtmlEntities } from "../../../lib/text";
import { mirrorAddon } from "../../../lib/mirror";
import Brand from "../../brand";
import TrackedActions from "./tracked-actions";

type Addon = {
  content_id: string;
  title: string;
  overview?: string;
  description?: string;
  author_displayname?: string;
  categories?: string[];
  hardware_platforms?: string[];
  published?: boolean;
  deleted?: boolean;
  deleted_at?: string;
  source?: "bethesda" | "esoui";
  source_url?: string;
  download_url?: string;
  archive_repository?: string;
  archive_path?: string;
  version?: string;
  stats?: { totals?: { downloads?: number; subscribes?: number } };
  download?: Array<{
    hardware_platform: string;
    published?: Array<{
      version_name: string;
      client: Record<string, { download_url: string; size: number }>;
    }>;
  }>;
};

const getAddon = cache(async (id: string): Promise<Addon | null> => {
  const archived = await mirrorAddon(id);
  if (!isUuid(id)) return archived;
  const response = await fetch(`${API}/content/${encodeURIComponent(id)}`, {
    ...withTimeout(),
    headers: bethesdaHeaders(),
    cache: "no-store",
  });
  if (response.ok) {
    const addon = platformResponse(await jsonFromBethesda(response)) as Addon;
    return archived
      ? { ...archived, ...addon, deleted: archived.deleted }
      : addon;
  }
  return archived;
});

const formatCount = (count = 0) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(count);

const mirrorUrl = (addon: Addon) =>
  addon.archive_repository && addon.archive_path
    ? `https://github.com/${addon.archive_repository}/tree/main/${addon.archive_path}`
    : "https://github.com/the-jolly-green-bryant/eso-addon-mirror";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const addon = await getAddon((await params).id);
  if (!addon) return { title: "Addon not found — ESO Addon Workshop" };
  return {
    title: `${decodeHtmlEntities(addon.title)} — ESO Addon Workshop`,
    description: decodeHtmlEntities(
      addon.overview || `View and download ${addon.title}.`,
    ),
    alternates: {
      canonical: `https://eso-addon-uploader.bryantjames.com/addons/${addon.content_id}`,
    },
    openGraph: {
      type: "article",
      url: `https://eso-addon-uploader.bryantjames.com/addons/${addon.content_id}`,
      title: `${decodeHtmlEntities(addon.title)} — ESO Addon Workshop`,
      description: decodeHtmlEntities(
        addon.overview || `View and download ${addon.title}.`,
      ),
    },
  };
}

export default async function AddonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ platform?: string }>;
}) {
  const addon = await getAddon((await params).id);
  if (!addon) notFound();

  const requestedPlatform = (await searchParams).platform;
  const backPlatform = requestedPlatform === "pc-mac" ? "pc-mac" : "console";

  const latest = addon.download?.find(
    (entry) => entry.hardware_platform === "WINDOWS",
  )?.published?.[0];

  return (
    <main className="addon-page">
      <header className="detail-topbar">
        <Brand />
        <Link className="back-link" href={`/?platform=${backPlatform}`}>
          ← Back to addons
        </Link>
      </header>

      <article className="standalone-detail">
        <div className="detail-banner">
          <div className="detail-sigil">
            {decodeHtmlEntities(addon.title).slice(0, 1)}
          </div>
        </div>
        <div className="detail-body">
          <p className="eyebrow">
            {decodeHtmlEntities(addon.categories?.[0] || "COMMUNITY ADDON")}
          </p>
          <h1>{decodeHtmlEntities(addon.title)}</h1>
          <p className="byline">
            Crafted by{" "}
            <strong>
              {decodeHtmlEntities(
                addon.author_displayname || "Unknown artisan",
              )}
            </strong>
          </p>
          {addon.deleted && (
            <p className="deleted-notice">
              <strong>Deleted upstream.</strong> Bethesda no longer lists this
              addon. ESO Addon Workshop preserves its last observed metadata and
              mirror so the community can still inspect and download the
              archived release.
            </p>
          )}

          <div className="platforms">
            {addon.hardware_platforms?.map((platform) => (
              <span className="platform-chip" key={platform}>
                {platform
                  .replace("XBOXSERIESX", "XBOX")
                  .replace("PLAYSTATION5", "PS5")}
              </span>
            ))}
          </div>

          <div className="markdown-body">
            <Markdown remarkPlugins={[remarkGfm]}>
              {addon.description ||
                addon.overview ||
                "No description has been provided."}
            </Markdown>
          </div>

          <div className="detail-stats">
            <div>
              <strong>{formatCount(addon.stats?.totals?.downloads)}</strong>
              <span>downloads</span>
            </div>
            <div>
              <strong>{formatCount(addon.stats?.totals?.subscribes)}</strong>
              <span>subscribers</span>
            </div>
            <div>
              <strong>
                {latest?.version_name || addon.version || "Latest"}
              </strong>
              <span>version</span>
            </div>
          </div>

          <TrackedActions
            contentId={addon.content_id}
            title={decodeHtmlEntities(addon.title)}
            mirrorUrl={mirrorUrl(addon)}
            downloadUrl={
              addon.download_url ||
              `/api/bethesda/download?id=${encodeURIComponent(addon.content_id)}`
            }
          />
        </div>
      </article>
    </main>
  );
}
