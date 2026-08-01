"use client";

import {
  IonButton,
  IonChip,
  IonIcon,
  IonInput,
  IonModal,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  setupIonicReact,
} from "@ionic/react";
import {
  addOutline,
  archiveOutline,
  arrowDownOutline,
  closeOutline,
  cloudUploadOutline,
  createOutline,
  codeSlashOutline,
  logInOutline,
  logOutOutline,
  logoGithub,
  openOutline,
  personCircleOutline,
  searchOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
} from "ionicons/icons";
import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Brand from "./brand";
import { track } from "../lib/analytics";
import type { CatalogSourceTotals } from "../lib/catalog";
import { decodeHtmlEntities } from "../lib/text";

setupIonicReact();

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
  source?: "bethesda" | "esoui";
  source_url?: string;
  download_url?: string;
  archive_repository?: string;
  archive_path?: string;
  archived?: boolean;
  status?: string;
  stats?: { totals?: { downloads?: number; subscribes?: number } };
  download?: Array<{
    hardware_platform: string;
    published?: Array<{
      version_name: string;
      client: Record<string, { download_url: string; size: number }>;
    }>;
  }>;
};

const samples: Addon[] = [
  {
    content_id: "2a88cc14-8e8c-4b73-9605-2e1d7c764e23",
    title: "TSC Price Fetcher 2",
    overview: "Weekly guild trader prices, right in your inventory tooltips.",
    author_displayname: "SavageTSC",
    categories: ["Guild Traders & Vendors"],
    hardware_platforms: ["WINDOWS", "PLAYSTATION5", "XBOXSERIESX"],
    stats: { totals: { downloads: 410765, subscribes: 40856 } },
    published: true,
    source: "bethesda",
  },
  {
    content_id: "eeff2a8e-c911-4984-a07f-784c7155ddad",
    title: "Dolgubon's Lazy Writ Crafter",
    overview: "A calmer, faster daily crafting routine for every character.",
    author_displayname: "Dolgubon",
    categories: ["Crafting"],
    hardware_platforms: ["WINDOWS", "PLAYSTATION5", "XBOXSERIESX"],
    stats: { totals: { downloads: 287421, subscribes: 31204 } },
    published: true,
    source: "bethesda",
  },
  {
    content_id: "68111c3f-410f-4318-b9ec-582b8c68c374",
    title: "LibAddonMenu",
    overview: "Shared settings panels for your favorite addons.",
    author_displayname: "sirinsidiator",
    categories: ["Libraries"],
    hardware_platforms: ["WINDOWS"],
    stats: { totals: { downloads: 195310, subscribes: 22518 } },
    published: true,
    source: "esoui",
  },
];

type AddonPlatform = "console" | "pc-mac";

const initialPlatform = (): AddonPlatform => {
  if (typeof window === "undefined") return "console";
  return new URLSearchParams(window.location.search).get("platform") ===
    "pc-mac"
    ? "pc-mac"
    : "console";
};

const samplesForPlatform = (platform: AddonPlatform) =>
  samples.filter((addon) =>
    platform === "pc-mac"
      ? addon.source === "esoui"
      : addon.source === "bethesda",
  );

const formatCount = (count = 0) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(count);

const mirrorUrl = (addon: Addon) =>
  addon.archive_repository && addon.archive_path
    ? `https://github.com/${addon.archive_repository}/tree/main/${addon.archive_path}`
    : "https://github.com/the-jolly-green-bryant/eso-addon-mirror";

const downloadUrl = (addon: Addon) =>
  addon.download_url ||
  `/api/bethesda/download?id=${encodeURIComponent(addon.content_id)}`;

export function AddonApp({
  initialTab = "explore",
}: {
  initialTab?: "explore" | "mine";
}) {
  const tab = initialTab;
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<AddonPlatform>(initialPlatform);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(() => samplesForPlatform(platform).length);
  const [sourceTotals, setSourceTotals] = useState<CatalogSourceTotals>(() =>
    platform === "pc-mac"
      ? { bethesda: 0, esoui: samplesForPlatform(platform).length }
      : { bethesda: samplesForPlatform(platform).length, esoui: 0 },
  );
  const [addons, setAddons] = useState<Addon[]>(() =>
    samplesForPlatform(platform),
  );
  const [mine, setMine] = useState<Addon[]>([]);
  const [selected, setSelected] = useState<Addon | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const searchRequest = useRef(0);

  const search = useCallback(async () => {
    const request = ++searchRequest.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        text: query,
        platform,
        page: String(page),
        size: "30",
      });
      const response = await fetch(`/api/bethesda/catalog?${params}`);
      if (!response.ok) throw new Error("Catalog request failed");
      const body = await response.json();
      if (request !== searchRequest.current) return;
      setAddons(Array.isArray(body.data) ? body.data : samples);
      setTotal(typeof body.total === "number" ? body.total : body.data?.length || 0);
      setPageCount(typeof body.pageCount === "number" ? body.pageCount : 1);
      setSourceTotals({
        bethesda: Number(body.sourceTotals?.bethesda) || 0,
        esoui: Number(body.sourceTotals?.esoui) || 0,
      });
      if (query.trim()) {
        track("search", {
          search_term: query.trim(),
          addon_platform: platform,
          results_count: body.total || 0,
          catalog_page: page,
        });
      }
    } catch {
      if (request !== searchRequest.current) return;
      const fallback = samplesForPlatform(platform);
      setAddons(fallback);
      setTotal(fallback.length);
      setPageCount(1);
      setSourceTotals(
        platform === "pc-mac"
          ? { bethesda: 0, esoui: fallback.length }
          : { bethesda: fallback.length, esoui: 0 },
      );
      setNotice("Showing a preview while the unified catalog reconnects.");
    } finally {
      if (request === searchRequest.current) setLoading(false);
    }
  }, [query, platform, page]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("platform", platform);
    window.history.replaceState(window.history.state, "", url);
  }, [platform]);

  useEffect(() => {
    const timer = setTimeout(search, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadMine = useCallback(async () => {
    const response = await fetch("/api/bethesda/me");
    if (!response.ok) {
      if (initialTab === "mine") setLoginOpen(true);
      return;
    }
    const body = await response.json();
    setAccount(body.username || "Bethesda author");
    setMine(body.data || []);
  }, [initialTab]);

  useEffect(() => {
    // Initial data loading intentionally synchronizes the UI with the session API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMine();
  }, [loadMine]);

  const categories = useMemo(() => ["PC Addon", "Console Addon"], []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    const response = await fetch("/api/bethesda/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) return setNotice(body.error || "Bethesda login failed.");
    setAccount(body.username);
    setLoginOpen(false);
    setNotice("Connected securely to Bethesda.net.");
    track("login", { method: "Bethesda.net" });
    loadMine();
  }

  async function logout() {
    await fetch("/api/bethesda/logout", { method: "POST" });
    setAccount(null);
    setMine([]);
    window.location.assign("/");
  }

  async function saveAddon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const editing =
      selected?.content_id &&
      mine.some((item) => item.content_id === selected.content_id);
    const response = await fetch(
      editing
        ? `/api/bethesda/addons/${selected.content_id}`
        : "/api/bethesda/addons",
      {
        method: editing ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          overview: form.get("overview"),
          description: form.get("description"),
          category: form.get("category"),
        }),
      },
    );
    const body = await response.json();
    if (!response.ok)
      return setNotice(body.error || "Could not save the addon.");
    const archive = form.get("archive");
    const addonId = editing ? selected!.content_id : body.content_id;
    if (archive instanceof File && archive.size && addonId) {
      const upload = new FormData();
      upload.set("archive", archive);
      upload.set("addonId", addonId);
      upload.set("version", String(form.get("version") || "1.0.0"));
      upload.set(
        "note",
        String(form.get("note") || "Initial ESO Addon Workshop upload"),
      );
      const uploadResponse = await fetch("/api/bethesda/upload", {
        method: "POST",
        body: upload,
      });
      const uploadBody = await uploadResponse.json();
      if (!uploadResponse.ok) {
        setNotice(
          uploadBody.error ||
            "Draft saved, but Bethesda did not accept the package.",
        );
        setEditorOpen(false);
        loadMine();
        return;
      }
    }
    setEditorOpen(false);
    setSelected(null);
    setNotice(editing ? "Draft updated." : "New unpublished draft created.");
    track(editing ? "addon_updated" : "addon_created", {
      addon_id: addonId,
      has_archive: archive instanceof File && archive.size > 0,
    });
    loadMine();
  }

  const visible = tab === "mine" ? mine : addons;

  return (
    <main>
      <header className="topbar">
        <Brand />
        <nav aria-label="Primary">
          <Link className={tab === "explore" ? "active" : ""} href="/">
            Explore
          </Link>
          <Link className={tab === "mine" ? "active" : ""} href="/my-addons">
            My addons
          </Link>
          <a href="https://docs.eso-addon-uploader.bryantjames.com">
            <IonIcon icon={codeSlashOutline} /> Developer API
          </a>
        </nav>
        <div className="header-actions">
          <a
            className="source-link"
            href="https://github.com/the-jolly-green-bryant/eso-addon-uploader"
            target="_blank"
            rel="noreferrer"
            aria-label="View the open-source ESO Addon Workshop code on GitHub"
          >
            <IonIcon icon={logoGithub} />
            <span>GitHub</span>
          </a>
          {account ? (
            <div className="account">
              <IonIcon icon={personCircleOutline} />
              <span>{account}</span>
              <button aria-label="Log out" onClick={logout}>
                <IonIcon icon={logOutOutline} />
              </button>
            </div>
          ) : (
            <IonButton
              className="login-button"
              onClick={() => setLoginOpen(true)}
            >
              <IonIcon slot="start" icon={logInOutline} /> Bethesda login
            </IonButton>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <IonChip>
            <IonIcon icon={sparklesOutline} /> Open-source addon platform
          </IonChip>
          <h1>
            {tab === "mine"
              ? "Your addons. One workbench."
              : "Build Tamriel your way."}
          </h1>
          <p>
            {tab === "mine"
              ? "Draft, package, and publish your work from any platform—with every important step out in the open."
              : "Discover, download, and publish community-made ESO addons from one definitive, transparent workshop."}
          </p>
        </div>
        <div className="hero-workbench" aria-label="Workshop capabilities">
          <div>
            <span>01</span>
            <strong>DISCOVER</strong>
            <small>Search the live catalog</small>
          </div>
          <div>
            <span>02</span>
            <strong>PACKAGE</strong>
            <small>Build a clean release</small>
          </div>
          <div>
            <span>03</span>
            <strong>PUBLISH</strong>
            <small>Ship through Bethesda</small>
          </div>
          <p>
            <strong>{formatCount(410765)}</strong> community downloads tracked
          </p>
        </div>
      </section>

      <section className="suite-strip" aria-label="ESO tools ecosystem">
        <p>
          <span>BUILT FOR CREATORS</span>
          The open companion to ESO Market Tracker.
        </p>
        <a href="https://esomarkettracker.com" target="_blank" rel="noreferrer">
          Explore market data <IonIcon icon={openOutline} />
        </a>
      </section>

      {notice && (
        <div className="notice" role="status">
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            <IonIcon icon={closeOutline} />
          </button>
        </div>
      )}

      <section className="catalog">
        <div className="catalog-head">
          <div>
            <p className="eyebrow">
              {tab === "mine" ? "AUTHOR WORKBENCH" : "ADDON CATALOG"}
            </p>
            <h2>
              {tab === "mine"
                ? `${mine.length} addons on your workbench`
                : platform === "pc-mac"
                  ? "Find your next PC / Mac essential"
                  : "Find your next console essential"}
            </h2>
          </div>
          {tab === "mine" && (
            <IonButton
              onClick={() => {
                setSelected(null);
                setEditorOpen(true);
              }}
            >
              <IonIcon slot="start" icon={addOutline} /> New addon
            </IonButton>
          )}
        </div>

        {tab === "explore" && (
          <div className="filters">
            <IonSearchbar
              value={query}
              debounce={0}
              onIonInput={(event) => {
                setQuery(event.detail.value || "");
                setPage(1);
              }}
              placeholder="Search titles, descriptions, and authors"
              searchIcon={searchOutline}
            />
            <IonSelect
              value={platform}
              aria-label="Addon platform"
              onIonChange={(event) => {
                const nextPlatform = event.detail.value as AddonPlatform;
                setPlatform(nextPlatform);
                setPage(1);
                track("addon_platform_changed", {
                  addon_platform: nextPlatform,
                });
              }}
            >
              <IonSelectOption value="console">Console</IonSelectOption>
              <IonSelectOption value="pc-mac">PC / Mac</IonSelectOption>
            </IonSelect>
            <div className="catalog-status" aria-live="polite">
              <strong>{total.toLocaleString()} results</strong>
              {platform === "pc-mac" ? (
                <span>
                  {sourceTotals.esoui.toLocaleString()} PC / Mac · ESOUI
                </span>
              ) : (
                <span>
                  {sourceTotals.bethesda.toLocaleString()} Console · Bethesda
                </span>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">
            <IonSpinner /> Consulting the archive…
          </div>
        ) : (
          <div className="addon-grid">
            {visible.map((addon, index) => (
              <article className="addon-card" key={addon.content_id}>
                <Link
                  className="card-main"
                  href={`/addons/${encodeURIComponent(addon.content_id)}?platform=${platform}`}
                  onClick={() =>
                    track("select_content", {
                      content_type: "addon",
                      item_id: addon.content_id,
                      item_name: decodeHtmlEntities(addon.title),
                    })
                  }
                >
                  <div className={`sigil sigil-${index % 4}`}>
                    {decodeHtmlEntities(addon.title).slice(0, 1)}
                  </div>
                  <div className="card-copy">
                    <div className="card-meta">
                      <span
                        className={`source-badge source-${addon.source || "bethesda"}`}
                      >
                        {addon.source === "esoui"
                          ? "PC · ESOUI"
                          : "Console · Bethesda"}
                      </span>
                      <span>
                        {decodeHtmlEntities(
                          addon.categories?.[0] || "Community",
                        )}
                      </span>
                      {addon.deleted && (
                        <span className="deleted-badge">Deleted upstream</span>
                      )}
                      {!addon.published && <span className="draft">Draft</span>}
                    </div>
                    <h3>{decodeHtmlEntities(addon.title)}</h3>
                    <p>
                      {decodeHtmlEntities(
                        addon.overview ||
                          "A new creation waiting in the workshop.",
                      )}
                    </p>
                    <div className="author">
                      by{" "}
                      {decodeHtmlEntities(
                        addon.author_displayname ||
                          account ||
                          "Unknown artisan",
                      )}
                    </div>
                  </div>
                </Link>
                <footer>
                  <span>
                    <IonIcon icon={arrowDownOutline} />{" "}
                    {formatCount(addon.stats?.totals?.downloads)}
                  </span>
                  <span>{addon.hardware_platforms?.length || 0} platforms</span>
                  {tab === "mine" && (
                    <button
                      onClick={() => {
                        setSelected(addon);
                        setEditorOpen(true);
                      }}
                    >
                      <IonIcon icon={createOutline} /> Edit
                    </button>
                  )}
                  <div className="card-actions">
                    <a
                      href={mirrorUrl(addon)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() =>
                        track("addon_mirror_click", {
                          addon_id: addon.content_id,
                          addon_title: decodeHtmlEntities(addon.title),
                        })
                      }
                    >
                      <IonIcon icon={codeSlashOutline} /> View mirror
                    </a>
                    <a
                      className="card-download"
                      href={downloadUrl(addon)}
                      target={addon.download_url ? "_blank" : undefined}
                      rel={addon.download_url ? "noreferrer" : undefined}
                      download
                      onClick={() =>
                        track("file_download", {
                          addon_id: addon.content_id,
                          addon_title: decodeHtmlEntities(addon.title),
                          file_extension: "zip",
                        })
                      }
                    >
                      <IonIcon icon={arrowDownOutline} /> Download ZIP
                    </a>
                  </div>
                </footer>
              </article>
            ))}
            {!visible.length && (
              <div className="empty">
                <IonIcon icon={archiveOutline} />
                <h3>
                  {tab === "mine"
                    ? "Your workbench is clear"
                    : `No ${platform === "pc-mac" ? "PC / Mac" : "console"} addons found`}
                </h3>
                <p>
                  {tab === "mine"
                    ? "Create your first cross-platform addon draft."
                    : "Try a broader search."}
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "explore" && !loading && pageCount > 1 && (
          <nav className="pagination" aria-label="Addon catalog pages">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              ← Previous
            </button>
            <span>
              Page <strong>{page.toLocaleString()}</strong> of{" "}
              <strong>{pageCount.toLocaleString()}</strong>
            </span>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
            >
              Next →
            </button>
          </nav>
        )}
      </section>

      <IonModal
        isOpen={loginOpen}
        onDidDismiss={() => setLoginOpen(false)}
        className="compact-modal"
      >
        <form className="modal-card" onSubmit={login}>
          <button
            type="button"
            className="modal-close"
            onClick={() => setLoginOpen(false)}
          >
            <IonIcon icon={closeOutline} />
          </button>
          <div className="modal-icon">
            <IonIcon icon={shieldCheckmarkOutline} />
          </div>
          <p className="eyebrow">YOUR BETHESDA DEVELOPER ACCOUNT</p>
          <h2>Sign in with Bethesda.net</h2>
          <p>
            Use your own Bethesda.net developer or addon-author account. This
            does not create an ESO Addon Workshop account. Your credentials are
            exchanged with Bethesda from the server, your password is never
            stored, and the implementation is publicly auditable on GitHub.
          </p>
          <a
            className="login-source-link"
            href="https://github.com/the-jolly-green-bryant/eso-addon-uploader"
            target="_blank"
            rel="noreferrer"
          >
            <IonIcon icon={logoGithub} /> Inspect the login source
          </a>
          <IonInput
            name="username"
            label="Bethesda.net developer username"
            labelPlacement="stacked"
            fill="outline"
            required
          />
          <IonInput
            name="password"
            type="password"
            label="Bethesda.net password"
            labelPlacement="stacked"
            fill="outline"
            required
          />
          <IonButton type="submit" expand="block" disabled={loading}>
            {loading ? <IonSpinner /> : "Connect my Bethesda account"}
          </IonButton>
        </form>
      </IonModal>

      <IonModal
        isOpen={editorOpen}
        onDidDismiss={() => {
          setEditorOpen(false);
          setSelected(null);
        }}
        className="editor-modal"
      >
        <form className="editor" onSubmit={saveAddon}>
          <div className="editor-head">
            <div>
              <p className="eyebrow">AUTHOR WORKSHOP</p>
              <h2>{selected ? "Edit addon" : "Create a draft"}</h2>
            </div>
            <button
              type="button"
              aria-label="Close addon editor"
              onClick={() => setEditorOpen(false)}
            >
              <IonIcon icon={closeOutline} />
            </button>
          </div>
          <div className="editor-grid">
            <section>
              <IonInput
                name="title"
                value={selected?.title}
                label="Title"
                labelPlacement="stacked"
                fill="outline"
                required
              />
              <IonTextarea
                name="overview"
                value={selected?.overview}
                label="Short overview"
                labelPlacement="stacked"
                fill="outline"
                maxlength={180}
                rows={3}
                required
              />
              <IonTextarea
                name="description"
                value={selected?.description}
                label="Description"
                labelPlacement="stacked"
                fill="outline"
                rows={9}
                required
              />
              <IonSelect
                name="category"
                value={selected?.categories?.[0] || "User Interface"}
                label="Category"
                labelPlacement="stacked"
                fill="outline"
              >
                {categories.map((item) => (
                  <IonSelectOption key={item}>{item}</IonSelectOption>
                ))}
              </IonSelect>
            </section>
            <aside className="upload-zone">
              <IonIcon icon={cloudUploadOutline} />
              <h3>Addon package</h3>
              <p>
                Drop a ZIP here or choose a file. Maximum package size: 200 MB.
              </p>
              <input type="file" name="archive" accept=".zip" />
              <IonInput
                name="version"
                label="Version label"
                labelPlacement="stacked"
                fill="outline"
                placeholder="1.0.0"
              />
              <IonInput
                name="note"
                label="Release note"
                labelPlacement="stacked"
                fill="outline"
                placeholder="What changed?"
              />
              <small>
                Packages remain unpublished until validation succeeds.
              </small>
            </aside>
          </div>
          <div className="editor-actions">
            <span>
              <IonIcon icon={shieldCheckmarkOutline} /> Saves as an unpublished
              draft
            </span>
            <IonButton type="submit">
              {selected ? "Save changes" : "Create draft"}
            </IonButton>
          </div>
        </form>
      </IonModal>

      <footer className="site-footer">
        <div>
          <Brand compact />
          <p>
            Open tools for discovering, preserving, and publishing Elder Scrolls
            Online addons.
          </p>
        </div>
        <nav aria-label="Footer">
          <a href="https://docs.eso-addon-uploader.bryantjames.com">
            Developer API
          </a>
          <a
            href="https://github.com/the-jolly-green-bryant/eso-addon-uploader"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <IonIcon icon={openOutline} />
          </a>
          <a
            href="https://esomarkettracker.com"
            target="_blank"
            rel="noreferrer"
          >
            ESO Market Tracker <IonIcon icon={openOutline} />
          </a>
        </nav>
        <small>
          Independent community project. Not affiliated with Bethesda, ZeniMax,
          or The Elder Scrolls Online.
        </small>
      </footer>
    </main>
  );
}
