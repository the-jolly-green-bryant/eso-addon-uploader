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
  personCircleOutline,
  searchOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
} from "ionicons/icons";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { track } from "../lib/analytics";
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
  },
];

const formatCount = (count = 0) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(count);

const mirrorUrl = (contentId: string) =>
  `https://github.com/the-jolly-green-bryant/eso-addon-mirror/search?q=${encodeURIComponent(contentId)}&type=code`;

const downloadUrl = (contentId: string) =>
  `/api/bethesda/download?id=${encodeURIComponent(contentId)}`;

export function AddonApp({ initialTab = "explore" }: { initialTab?: "explore" | "mine" }) {
  const tab = initialTab;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [addons, setAddons] = useState<Addon[]>(samples);
  const [mine, setMine] = useState<Addon[]>([]);
  const [selected, setSelected] = useState<Addon | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ text: query, size: "30" });
      if (category !== "all") params.set("categories", category);
      const response = await fetch(`/api/bethesda/catalog?${params}`);
      const body = await response.json();
      setAddons(body.data?.length ? body.data : samples);
      if (query.trim()) {
        track("search", {
          search_term: query.trim(),
          search_category: category,
          results_count: body.data?.length || 0,
        });
      }
    } catch {
      setAddons(samples);
      setNotice("Showing a preview while the Bethesda catalog reconnects.");
    } finally {
      setLoading(false);
    }
  }, [query, category]);

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

  const categories = useMemo(
    () => ["all", "Crafting", "Guild Traders & Vendors", "Libraries", "User Interface"],
    [],
  );

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
    const editing = selected?.content_id && mine.some((item) => item.content_id === selected.content_id);
    const response = await fetch(
      editing ? `/api/bethesda/addons/${selected.content_id}` : "/api/bethesda/addons",
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
    if (!response.ok) return setNotice(body.error || "Could not save the addon.");
    const archive = form.get("archive");
    const addonId = editing ? selected!.content_id : body.content_id;
    if (archive instanceof File && archive.size && addonId) {
      const upload = new FormData();
      upload.set("archive", archive);
      upload.set("addonId", addonId);
      upload.set("version", String(form.get("version") || "1.0.0"));
      upload.set("note", String(form.get("note") || "Initial Wayrest Workshop upload"));
      const uploadResponse = await fetch("/api/bethesda/upload", { method: "POST", body: upload });
      const uploadBody = await uploadResponse.json();
      if (!uploadResponse.ok) {
        setNotice(uploadBody.error || "Draft saved, but Bethesda did not accept the package.");
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
        <Link className="brand" href="/" aria-label="Wayrest Workshop home">
          <span className="brand-mark">W</span>
          <span><strong>Wayrest</strong><small>Workshop</small></span>
        </Link>
        <nav aria-label="Primary">
          <Link className={tab === "explore" ? "active" : ""} href="/">Explore</Link>
          <Link className={tab === "mine" ? "active" : ""} href="/my-addons">My addons</Link>
          <a href="https://docs.eso-addon-uploader.bryantjames.com"><IonIcon icon={codeSlashOutline} /> For Devs</a>
        </nav>
        <div className="header-actions">
          <a
            className="source-link"
            href="https://github.com/the-jolly-green-bryant/eso-addon-uploader"
            target="_blank"
            rel="noreferrer"
            aria-label="View the open-source Wayrest Workshop code on GitHub"
          >
            <IonIcon icon={logoGithub} />
            <span>Open source</span>
          </a>
          {account ? (
            <div className="account">
              <IonIcon icon={personCircleOutline} />
              <span>{account}</span>
              <button aria-label="Log out" onClick={logout}><IonIcon icon={logOutOutline} /></button>
            </div>
          ) : (
            <IonButton className="login-button" onClick={() => setLoginOpen(true)}>
              <IonIcon slot="start" icon={logInOutline} /> Bethesda login
            </IonButton>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <IonChip><IonIcon icon={sparklesOutline} /> Open addon commons</IonChip>
          <h1>{tab === "mine" ? "Your workshop." : "Make Tamriel feel like yours."}</h1>
          <p>{tab === "mine"
            ? "Draft, package, and publish your work from any platform."
            : "Discover community-made tools for a better adventure—transparent, searchable, and open."}</p>
        </div>
        <div className="hero-stat"><strong>{formatCount(410765)}</strong><span>community downloads</span></div>
      </section>

      {notice && <div className="notice" role="status">{notice}<button aria-label="Dismiss notice" onClick={() => setNotice("")}><IonIcon icon={closeOutline} /></button></div>}

      <section className="catalog">
        <div className="catalog-head">
          <div>
            <p className="eyebrow">{tab === "mine" ? "AUTHOR DESK" : "ADDON CATALOG"}</p>
            <h2>{tab === "mine" ? `${mine.length} addons in your workshop` : "Find your next essential"}</h2>
          </div>
          {tab === "mine" && (
            <IonButton onClick={() => { setSelected(null); setEditorOpen(true); }}>
              <IonIcon slot="start" icon={addOutline} /> New addon
            </IonButton>
          )}
        </div>

        {tab === "explore" && (
          <div className="filters">
            <IonSearchbar
              value={query}
              debounce={0}
              onIonInput={(event) => setQuery(event.detail.value || "")}
              placeholder="Search titles, descriptions, and authors"
              searchIcon={searchOutline}
            />
            <IonSelect value={category} aria-label="Category" onIonChange={(event) => setCategory(event.detail.value)}>
              {categories.map((item) => <IonSelectOption key={item} value={item}>{item === "all" ? "All categories" : item}</IonSelectOption>)}
            </IonSelect>
          </div>
        )}

        {loading ? <div className="loading"><IonSpinner /> Consulting the archive…</div> : (
          <div className="addon-grid">
            {visible.map((addon, index) => (
              <article className="addon-card" key={addon.content_id}>
                <Link
                  className="card-main"
                  href={`/addons/${encodeURIComponent(addon.content_id)}`}
                  onClick={() => track("select_content", {
                    content_type: "addon",
                    item_id: addon.content_id,
                    item_name: decodeHtmlEntities(addon.title),
                  })}
                >
                  <div className={`sigil sigil-${index % 4}`}>{decodeHtmlEntities(addon.title).slice(0, 1)}</div>
                  <div className="card-copy">
                    <div className="card-meta">
                      <span>{decodeHtmlEntities(addon.categories?.[0] || "Community")}</span>
                      {!addon.published && <span className="draft">Draft</span>}
                    </div>
                    <h3>{decodeHtmlEntities(addon.title)}</h3>
                    <p>{decodeHtmlEntities(addon.overview || "A new creation waiting in the workshop.")}</p>
                    <div className="author">by {decodeHtmlEntities(addon.author_displayname || account || "Unknown artisan")}</div>
                  </div>
                </Link>
                <footer>
                  <span><IonIcon icon={arrowDownOutline} /> {formatCount(addon.stats?.totals?.downloads)}</span>
                  <span>{addon.hardware_platforms?.length || 0} platforms</span>
                  {tab === "mine" && <button onClick={() => { setSelected(addon); setEditorOpen(true); }}><IonIcon icon={createOutline} /> Edit</button>}
                  <div className="card-actions">
                    <a
                      href={mirrorUrl(addon.content_id)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track("addon_mirror_click", { addon_id: addon.content_id, addon_title: decodeHtmlEntities(addon.title) })}
                    >
                      <IonIcon icon={codeSlashOutline} /> View mirror
                    </a>
                    <a
                      className="card-download"
                      href={downloadUrl(addon.content_id)}
                      download
                      onClick={() => track("file_download", { addon_id: addon.content_id, addon_title: decodeHtmlEntities(addon.title), file_extension: "zip" })}
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
                <h3>{tab === "mine" ? "Your workbench is clear" : "No addons found"}</h3>
                <p>{tab === "mine" ? "Create your first cross-platform addon draft." : "Try a broader search."}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <IonModal isOpen={loginOpen} onDidDismiss={() => setLoginOpen(false)} className="compact-modal">
        <form className="modal-card" onSubmit={login}>
          <button type="button" className="modal-close" onClick={() => setLoginOpen(false)}><IonIcon icon={closeOutline} /></button>
          <div className="modal-icon"><IonIcon icon={shieldCheckmarkOutline} /></div>
          <p className="eyebrow">YOUR BETHESDA DEVELOPER ACCOUNT</p>
          <h2>Sign in with Bethesda.net</h2>
          <p>Use your own Bethesda.net developer or addon-author account. This does not create a Wayrest account. Your credentials are exchanged with Bethesda from the server, your password is never stored, and the implementation is publicly auditable on GitHub.</p>
          <a className="login-source-link" href="https://github.com/the-jolly-green-bryant/eso-addon-uploader" target="_blank" rel="noreferrer">
            <IonIcon icon={logoGithub} /> Inspect the login source
          </a>
          <IonInput name="username" label="Bethesda.net developer username" labelPlacement="stacked" fill="outline" required />
          <IonInput name="password" type="password" label="Bethesda.net password" labelPlacement="stacked" fill="outline" required />
          <IonButton type="submit" expand="block" disabled={loading}>{loading ? <IonSpinner /> : "Connect my Bethesda account"}</IonButton>
        </form>
      </IonModal>

      <IonModal isOpen={editorOpen} onDidDismiss={() => { setEditorOpen(false); setSelected(null); }} className="editor-modal">
        <form className="editor" onSubmit={saveAddon}>
          <div className="editor-head">
            <div><p className="eyebrow">AUTHOR WORKSHOP</p><h2>{selected ? "Edit addon" : "Create a draft"}</h2></div>
            <button type="button" aria-label="Close addon editor" onClick={() => setEditorOpen(false)}><IonIcon icon={closeOutline} /></button>
          </div>
          <div className="editor-grid">
            <section>
              <IonInput name="title" value={selected?.title} label="Title" labelPlacement="stacked" fill="outline" required />
              <IonTextarea name="overview" value={selected?.overview} label="Short overview" labelPlacement="stacked" fill="outline" maxlength={180} rows={3} required />
              <IonTextarea name="description" value={selected?.description} label="Description" labelPlacement="stacked" fill="outline" rows={9} required />
              <IonSelect name="category" value={selected?.categories?.[0] || "User Interface"} label="Category" labelPlacement="stacked" fill="outline">
                {categories.slice(1).map((item) => <IonSelectOption key={item}>{item}</IonSelectOption>)}
              </IonSelect>
            </section>
            <aside className="upload-zone">
              <IonIcon icon={cloudUploadOutline} />
              <h3>Addon package</h3>
              <p>Drop a ZIP here or choose a file. Maximum package size: 200 MB.</p>
              <input type="file" name="archive" accept=".zip" />
              <IonInput name="version" label="Version label" labelPlacement="stacked" fill="outline" placeholder="1.0.0" />
              <IonInput name="note" label="Release note" labelPlacement="stacked" fill="outline" placeholder="What changed?" />
              <small>Packages remain unpublished until validation succeeds.</small>
            </aside>
          </div>
          <div className="editor-actions">
            <span><IonIcon icon={shieldCheckmarkOutline} /> Saves as an unpublished draft</span>
            <IonButton type="submit">{selected ? "Save changes" : "Create draft"}</IonButton>
          </div>
        </form>
      </IonModal>
    </main>
  );
}

export default function Home() {
  return <AddonApp />;
}
