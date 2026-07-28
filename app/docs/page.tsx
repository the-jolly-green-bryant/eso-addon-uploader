const endpoints = [
  ["GET", "/ugcmods/v2/content", "Confirmed", "Search and paginate the public ESO addon catalog."],
  ["GET", "/ugcmods/v2/content/{content_id}", "Confirmed", "Read one addon, including published release manifests."],
  ["POST", "/session/login", "Observed", "Exchange Bethesda credentials for an upstream session token."],
  ["POST", "/session/logout", "Observed", "Invalidate an upstream session token."],
  ["GET", "/ugcmods/v2/content/me", "Confirmed", "List addons owned by the authenticated author."],
  ["POST", "/ugcmods/v2/content", "Confirmed", "Create an unpublished addon draft."],
  ["PUT", "/ugcmods/v2/content/{content_id}", "Observed", "Update metadata for an owned addon."],
  ["POST", "/ugcmods/v2/upload/initiate", "Inferred", "Start a release upload and obtain a storage URL."],
  ["POST", "/ugcmods/v2/upload/complete", "Inferred", "Finalize an uploaded release."],
];

function Code({ children }: { children: string }) {
  return <pre><code>{children}</code></pre>;
}

export default function DeveloperDocs() {
  return (
    <div className="docs-shell">
      <aside className="docs-sidebar">
        <a className="docs-brand" href="#top"><span>W</span><strong>Bethesda API Notes</strong></a>
        <nav aria-label="Documentation">
          <p>Start here</p>
          <a href="#overview">Overview</a>
          <a href="#status">Evidence labels</a>
          <a href="#headers">Required headers</a>
          <p>API</p>
          <a href="#authentication">Authentication</a>
          <a href="#endpoints">Endpoints</a>
          <a href="#response-shape">Response envelope</a>
          <a href="/openapi.yaml">OpenAPI schema ↗</a>
          <p>How-to guides</p>
          <a href="#search-guide">Search addons</a>
          <a href="#download-guide">Download files</a>
          <a href="#draft-guide">Create a draft</a>
          <a href="#upload-guide">Upload a release</a>
        </nav>
        <a className="back-link" href="https://eso-addon-uploader.bryantjames.com">← Back to Workshop</a>
      </aside>

      <main className="docs-main" id="top">
        <header className="docs-topbar">
          <span>Unofficial Bethesda protocol reference</span>
          <div><a href="https://github.com/the-jolly-green-bryant/eso-addon-uploader">Research source</a><a href="/openapi.yaml">OpenAPI</a></div>
        </header>

        <article>
          <section className="docs-hero" id="overview">
            <div className="status-pill">Direct upstream API · no Workshop proxy</div>
            <h1>Bethesda ESO addon API.</h1>
            <p>Community-maintained notes for calling Bethesda’s addon service directly, based on observed ESOUploader traffic and requests exercised against the live service.</p>
            <div className="hero-actions"><a href="#quickstart">Quickstart</a><a className="secondary" href="#endpoints">Endpoint reference</a></div>
          </section>

          <section className="callout warning">
            <strong>Unofficial and subject to change</strong>
            <p>Bethesda has not published documentation for this API. Bethesda owns and operates these endpoints. Request your own application key, obey its terms and rate limits, and expect undocumented behavior to change.</p>
          </section>

          <section id="quickstart">
            <p className="kicker">QUICKSTART</p>
            <h2>Search Bethesda’s catalog directly</h2>
            <p>Make this request from a trusted backend. The <code>x-bnet-key</code> application key must not be embedded in a public website, desktop bundle, log, or repository.</p>
            <Code>{`const params = new URLSearchParams({
  product: "ESO",
  text: "crafting",
  page: "1",
  size: "20",
  sort: "utime",
  order: "desc",
  hardware_platforms: "WINDOWS,PLAYSTATION5,XBOXSERIESX",
  deleted: "false"
});

const response = await fetch(
  \`https://api.bethesda.net/ugcmods/v2/content?\${params}\`,
  { headers: { "x-bnet-key": process.env.BETHESDA_APP_KEY } }
);
const body = await response.json();
const catalog = body.platform?.response ?? body;`}</Code>
          </section>

          <section id="status">
            <p className="kicker">EVIDENCE LABELS</p>
            <h2>Read confidence before code</h2>
            <dl className="status-list">
              <div><dt className="confirmed">Confirmed</dt><dd>Exercised successfully against Bethesda’s live API with the expected result.</dd></div>
              <div><dt className="observed">Observed</dt><dd>Seen in ESOUploader traffic or exercised in a limited path; edge cases remain unknown.</dd></div>
              <div><dt className="inferred">Inferred</dt><dd>Reconstructed from adjacent traffic or response fields. Treat the request shape as experimental.</dd></div>
            </dl>
          </section>

          <section id="headers">
            <p className="kicker">REQUEST HEADERS</p>
            <h2>Application and session credentials</h2>
            <div className="mini-table">
              <span>x-bnet-key</span><p>Your Bethesda-issued application key. Required by the observed endpoints.</p>
              <span>x-session-token</span><p>JWT-like token returned by login. Required for author-owned mutations.</p>
              <span>accept</span><p><code>application/json</code></p>
              <span>content-type</span><p><code>application/json</code> for JSON operations.</p>
            </div>
            <div className="callout"><strong>Protect both credentials.</strong><p>Never publish an application key or session token. Redact passwords, authorization material, presigned storage URLs, and unpublished addon content from captures.</p></div>
          </section>

          <section id="authentication">
            <p className="kicker">AUTHENTICATION · OBSERVED</p>
            <h2>Create an upstream author session</h2>
            <p>Login is a direct request to Bethesda. Extract the returned session token from the response and retain it only in protected server-side session storage.</p>
            <Code>{`const response = await fetch("https://api.bethesda.net/session/login", {
  method: "POST",
  headers: {
    "accept": "application/json",
    "content-type": "application/json",
    "x-bnet-key": process.env.BETHESDA_APP_KEY
  },
  body: JSON.stringify({
    username: process.env.BETHESDA_USERNAME,
    password: process.env.BETHESDA_PASSWORD,
    language: "en"
  })
});

const login = await response.json();
// Find the returned JWT-like token, then send it as x-session-token.
// Do not persist or log the password.`}</Code>
          </section>

          <section id="endpoints">
            <p className="kicker">DIRECT BETHESDA API</p>
            <h2>Observed endpoints</h2>
            <div className="endpoint-list">
              {endpoints.map(([method, path, status, description]) => (
                <div className="endpoint" key={`${method}${path}`}>
                  <span className={`method ${method.toLowerCase()}`}>{method}</span>
                  <code>{path}</code>
                  <span className={`confidence ${status.toLowerCase()}`}>{status}</span>
                  <p>{description}</p>
                </div>
              ))}
            </div>
            <p className="schema-link">Parameters, request bodies, security schemes, and partial response models are in the <a href="/openapi.yaml">OpenAPI 3.1 document</a>.</p>
          </section>

          <section id="response-shape">
            <p className="kicker">RESPONSES</p>
            <h2>Unwrap the platform envelope</h2>
            <p>Many successful and unsuccessful responses nest their useful data beneath <code>platform.response</code>. Code defensively because some responses arrive unwrapped.</p>
            <Code>{`const body = await response.json();
const data = body?.platform?.response ?? body;
const message =
  body?.platform?.message ??
  body?.platform?.response?.message ??
  body?.message;`}</Code>
          </section>

          <section id="search-guide">
            <p className="kicker">HOW TO · CONFIRMED</p>
            <h2>Search and filter addons</h2>
            <ol>
              <li>Send <code>GET https://api.bethesda.net/ugcmods/v2/content</code>.</li>
              <li>Set <code>product=ESO</code>. Bethesda accepts <code>deleted</code>, but live testing found that <code>true</code> still returns the same active-only catalog.</li>
              <li>Preserve disappearing IDs and their last release yourself if deleted-content availability matters; Bethesda does not currently expose public tombstones.</li>
              <li>Add <code>text</code>, <code>categories</code>, or <code>author_displayname</code>.</li>
              <li>Paginate with <code>page</code> and <code>size</code>; the response includes <code>total</code>.</li>
              <li>Filter platforms with comma-separated <code>hardware_platforms</code>.</li>
            </ol>
          </section>

          <section id="download-guide">
            <p className="kicker">HOW TO · CONFIRMED</p>
            <h2>Reconstruct an addon download</h2>
            <ol>
              <li>Fetch <code>GET /ugcmods/v2/content/CONTENT_ID</code>.</li>
              <li>Choose the desired object in <code>download[]</code> by <code>hardware_platform</code>.</li>
              <li>Choose a release in <code>published[]</code> and inspect its <code>client</code> map.</li>
              <li>Fetch the client entry whose <code>download_url</code> identifies the manifest.</li>
              <li>The manifest maps client keys to archive paths. Fetch each corresponding client URL and write it at that path.</li>
              <li>Package the files locally if a ZIP is required.</li>
            </ol>
            <p>Download URLs may be short-lived or presigned. Do not log or redistribute them, and respect each addon author’s license.</p>
          </section>

          <section id="draft-guide">
            <p className="kicker">HOW TO · CONFIRMED</p>
            <h2>Create an unpublished addon draft</h2>
            <Code>{`const draft = await fetch(
  "https://api.bethesda.net/ugcmods/v2/content",
  {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "x-bnet-key": process.env.BETHESDA_APP_KEY,
      "x-session-token": sessionToken
    },
    body: JSON.stringify({
      title: "My Addon",
      overview: "A short public summary",
      description: "Full Markdown description",
      product: "ESO",
      content_type: "STANDARD",
      hardware_platforms: ["WINDOWS", "PLAYSTATION5", "XBOXSERIESX"],
      categories: ["User Interface"],
      default_locale: "EN",
      supported_locales: ["EN"]
    })
  }
);`}</Code>
            <p>Store the returned <code>content_id</code>. Update owned metadata with <code>PUT /ugcmods/v2/content/CONTENT_ID</code> using the same authentication headers.</p>
          </section>

          <section id="upload-guide">
            <p className="kicker">HOW TO · INFERRED</p>
            <h2>Upload a release archive</h2>
            <div className="callout warning"><strong>Experimental request shape.</strong><p>The initiate/storage PUT/complete handshake has not been fully documented. Keep a local copy, test only against an addon you own, and verify the result in Bethesda’s author tools.</p></div>
            <ol>
              <li>POST JSON release metadata to <code>/ugcmods/v2/upload/initiate</code> with both credential headers.</li>
              <li>Read the upload ID and presigned storage URL from the response.</li>
              <li>PUT the archive bytes directly to that storage URL and retain its returned <code>ETag</code>.</li>
              <li>POST the upload ID, content ID, part number, and ETag to <code>/ugcmods/v2/upload/complete</code>.</li>
            </ol>
            <p>See the OpenAPI document for the currently inferred fields. Do not assume the storage provider, response nesting, or multipart behavior is stable.</p>
          </section>

          <footer className="docs-footer">
            <p>Independent protocol research—not an official Bethesda service.</p>
            <div><a href="https://github.com/the-jolly-green-bryant/eso-addon-uploader/blob/main/SECURITY.md">Security</a><a href="https://github.com/the-jolly-green-bryant/eso-addon-uploader">Source</a></div>
          </footer>
        </article>
      </main>
    </div>
  );
}
