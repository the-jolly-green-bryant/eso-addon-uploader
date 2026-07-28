import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API, bethesdaHeaders, isUuid, jsonFromBethesda, platformResponse, withTimeout } from "../../api/bethesda/_client";
import { decodeHtmlEntities } from "../../../lib/text";
import { deletedMirrorAddon } from "../../../lib/mirror";
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
  if (!isUuid(id)) return null;
  const [response, archived] = await Promise.all([
    fetch(`${API}/content/${encodeURIComponent(id)}`, {
      ...withTimeout(),
      headers: bethesdaHeaders(),
      cache: "no-store",
    }),
    deletedMirrorAddon(id),
  ]);
  if (response.ok) {
    const addon = platformResponse(await jsonFromBethesda(response)) as Addon;
    return archived ? { ...addon, deleted: true, deleted_at: archived.deleted_at } : addon;
  }
  return archived ? {
    content_id: archived.content_id,
    title: archived.title,
    overview: "This addon is no longer listed by Bethesda. Its last mirrored release remains preserved.",
    deleted: true,
    deleted_at: archived.deleted_at,
    published: archived.published,
    hardware_platforms: ["WINDOWS"],
  } : null;
});

const formatCount = (count = 0) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(count);

const mirrorUrl = (contentId: string) =>
  `https://github.com/the-jolly-green-bryant/eso-addon-mirror/search?q=${encodeURIComponent(contentId)}&type=code`;

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const addon = await getAddon((await params).id);
  if (!addon) return { title: "Addon not found — Wayrest Workshop" };
  return {
    title: `${decodeHtmlEntities(addon.title)} — Wayrest Workshop`,
    description: decodeHtmlEntities(addon.overview || `View and download ${addon.title}.`),
    alternates: {
      canonical: `https://eso-addon-uploader.bryantjames.com/addons/${addon.content_id}`,
    },
    openGraph: {
      type: "article",
      url: `https://eso-addon-uploader.bryantjames.com/addons/${addon.content_id}`,
      title: `${decodeHtmlEntities(addon.title)} — Wayrest Workshop`,
      description: decodeHtmlEntities(addon.overview || `View and download ${addon.title}.`),
    },
  };
}

export default async function AddonPage({ params }: { params: Promise<{ id: string }> }) {
  const addon = await getAddon((await params).id);
  if (!addon) notFound();

  const latest = addon.download
    ?.find((entry) => entry.hardware_platform === "WINDOWS")
    ?.published?.[0];

  return (
    <main className="addon-page">
      <header className="detail-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">W</span>
          <span><strong>Wayrest</strong><small>Workshop</small></span>
        </Link>
        <Link className="back-link" href="/">← Back to addons</Link>
      </header>

      <article className="standalone-detail">
        <div className="detail-banner">
          <div className="detail-sigil">{decodeHtmlEntities(addon.title).slice(0, 1)}</div>
        </div>
        <div className="detail-body">
          <p className="eyebrow">{decodeHtmlEntities(addon.categories?.[0] || "COMMUNITY ADDON")}</p>
          <h1>{decodeHtmlEntities(addon.title)}</h1>
          <p className="byline">Crafted by <strong>{decodeHtmlEntities(addon.author_displayname || "Unknown artisan")}</strong></p>
          {addon.deleted && (
            <p className="deleted-notice">
              <strong>Deleted upstream.</strong> Bethesda no longer lists this addon. Wayrest preserves its last observed metadata and mirror so the community can still inspect and download the archived release.
            </p>
          )}

          <div className="platforms">
            {addon.hardware_platforms?.map((platform) => (
              <span className="platform-chip" key={platform}>
                {platform.replace("XBOXSERIESX", "XBOX").replace("PLAYSTATION5", "PS5")}
              </span>
            ))}
          </div>

          <div className="markdown-body">
            <Markdown remarkPlugins={[remarkGfm]}>
              {addon.description || addon.overview || "No description has been provided."}
            </Markdown>
          </div>

          <div className="detail-stats">
            <div><strong>{formatCount(addon.stats?.totals?.downloads)}</strong><span>downloads</span></div>
            <div><strong>{formatCount(addon.stats?.totals?.subscribes)}</strong><span>subscribers</span></div>
            <div><strong>{latest?.version_name || "Latest"}</strong><span>version</span></div>
          </div>

          <TrackedActions
            contentId={addon.content_id}
            title={decodeHtmlEntities(addon.title)}
            mirrorUrl={mirrorUrl(addon.content_id)}
            downloadUrl={`/api/bethesda/download?id=${encodeURIComponent(addon.content_id)}`}
          />
        </div>
      </article>
    </main>
  );
}
