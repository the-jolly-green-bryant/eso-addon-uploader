const endpoints = [
  ["GET", "/api/bethesda/catalog", "Confirmed", "Search and paginate the public ESO addon catalog."],
  ["GET", "/api/bethesda/download?id={content_id}", "Confirmed", "Reconstruct the latest Windows release as a ZIP."],
  ["POST", "/api/bethesda/login", "Observed", "Exchange Bethesda credentials for a protected session cookie."],
  ["POST", "/api/bethesda/logout", "Observed", "Invalidate the upstream session and clear the local cookie."],
  ["GET", "/api/bethesda/me", "Confirmed", "List addons owned by the authenticated author."],
  ["POST", "/api/bethesda/addons", "Confirmed", "Create an unpublished addon draft."],
  ["PUT", "/api/bethesda/addons/{id}", "Observed", "Update metadata for an owned addon."],
  ["POST", "/api/bethesda/upload", "Inferred", "Initiate, transfer, and complete a ZIP upload."],
];

function Code({ children }: { children: string }) {
  return <pre><code>{children}</code></pre>;
}

export default function DeveloperDocs() {
  return (
    <div className="docs-shell">
      <aside className="docs-sidebar">
        <a className="docs-brand" href="#top"><span>W</span><strong>Wayrest Docs</strong></a>
        <nav aria-label="Documentation">
          <p>Start here</p>
          <a href="#overview">Overview</a>
          <a href="#trust">Trust & security</a>
          <a href="#status">Protocol status</a>
          <p>API</p>
          <a href="#authentication">Authentication</a>
          <a href="#endpoints">Endpoints</a>
          <a href="#errors">Errors</a>
          <a href="/openapi.yaml">OpenAPI schema ↗</a>
          <p>How-to guides</p>
          <a href="#search-guide">Search addons</a>
          <a href="#download-guide">Download a ZIP</a>
          <a href="#draft-guide">Create a draft</a>
          <a href="#upload-guide">Upload a release</a>
          <a href="#self-host">Self-host</a>
        </nav>
        <a className="back-link" href="https://eso-addon-uploader.bryantjames.com">← Back to Workshop</a>
      </aside>

      <main className="docs-main" id="top">
        <header className="docs-topbar">
          <span>Developer documentation</span>
          <div><a href="https://github.com/the-jolly-green-bryant/eso-addon-uploader">GitHub</a><a href="/openapi.yaml">OpenAPI</a></div>
        </header>

        <article>
          <section className="docs-hero" id="overview">
            <div className="status-pill">Unofficial, inspectable API adapter</div>
            <h1>Build with the addon commons.</h1>
            <p>Reference material for Wayrest Workshop’s same-origin API, the observed Bethesda protocol beneath it, and safe addon publishing workflows.</p>
            <div className="hero-actions"><a href="#quickstart">Quickstart</a><a className="secondary" href="#endpoints">API reference</a></div>
          </section>

          <section className="callout warning">
            <strong>Before you integrate</strong>
            <p>This is not an official Bethesda SDK. The public adapter is pre-1.0, upstream behavior can change without notice, and the archive upload handshake remains inferred. Never embed a Bethesda application key in browser code.</p>
          </section>

          <section id="quickstart">
            <p className="kicker">QUICKSTART</p>
            <h2>Search the public catalog</h2>
            <p>The catalog endpoint is public and returns normalized Bethesda response data. Query parameters are forwarded through a conservative allowlist.</p>
            <Code>{`const params = new URLSearchParams({
  text: "crafting",
  page: "1",
  size: "20",
  sort: "utime",
  order: "desc"
});

const response = await fetch(
  \`https://eso-addon-uploader.bryantjames.com/api/bethesda/catalog?\${params}\`
);
const { data } = await response.json();`}</Code>
          </section>

          <section id="trust">
            <p className="kicker">TRUST & SECURITY</p>
            <h2>What crosses each boundary</h2>
            <div className="trust-grid">
              <div><span>01</span><h3>Browser → Workshop</h3><p>Credentials are sent over HTTPS only during login. The password is not persisted.</p></div>
              <div><span>02</span><h3>Workshop → Bethesda</h3><p>The server adds its application key and forwards the minimum request required.</p></div>
              <div><span>03</span><h3>Session storage</h3><p>The token stays in an HttpOnly, Secure, SameSite=Lax cookie unavailable to client JavaScript.</p></div>
            </div>
            <p>Do not send authentication requests from third-party origins or build a credential-collecting client around this deployment. Self-host when you need a different trust boundary.</p>
          </section>

          <section id="status">
            <p className="kicker">EVIDENCE LABELS</p>
            <h2>Read confidence before code</h2>
            <dl className="status-list">
              <div><dt className="confirmed">Confirmed</dt><dd>Exercised successfully against the live API with expected results.</dd></div>
              <div><dt className="observed">Observed</dt><dd>Request shape was captured or exercised, but edge cases remain undocumented.</dd></div>
              <div><dt className="inferred">Inferred</dt><dd>Constructed from adjacent traffic or response clues; treat as experimental.</dd></div>
            </dl>
          </section>

          <section id="authentication">
            <p className="kicker">AUTHENTICATION</p>
            <h2>Cookie-based author sessions</h2>
            <p>Login accepts JSON and sets the session cookie on success. Browsers include it automatically on later same-origin author operations.</p>
            <Code>{`await fetch("/api/bethesda/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  credentials: "same-origin",
  body: JSON.stringify({
    username: "your-bethesda-username",
    password: "your-password"
  })
});`}</Code>
            <div className="callout"><strong>Never log the request body.</strong><p>Passwords, cookies, session tokens, app keys, and presigned URLs must be redacted from diagnostics and traffic captures.</p></div>
          </section>

          <section id="endpoints">
            <p className="kicker">API REFERENCE</p>
            <h2>Endpoints</h2>
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
            <p className="schema-link">Machine-readable details, parameters, bodies, and response schemas are in the <a href="/openapi.yaml">OpenAPI 3.1 document</a>.</p>
          </section>

          <section id="errors">
            <p className="kicker">ERRORS</p>
            <h2>Predictable failure envelopes</h2>
            <p>Adapter errors use an <code>error</code> string. Experimental upload errors also include a <code>phase</code> so clients can distinguish initiation, binary transfer, schema drift, and completion failures.</p>
            <Code>{`{
  "error": "Bethesda initiated the upload but returned an unfamiliar response.",
  "phase": "initiate-schema"
}`}</Code>
            <div className="mini-table"><span>400</span><p>Invalid or missing input</p><span>401</span><p>Missing or expired author session</p><span>413</span><p>Archive exceeds 200 MB</p><span>502/503</span><p>Upstream failure or server configuration missing</p></div>
          </section>

          <section id="search-guide">
            <p className="kicker">HOW TO</p>
            <h2>Search and filter addons</h2>
            <ol><li>Send <code>GET /api/bethesda/catalog</code>.</li><li>Add <code>text</code>, <code>categories</code>, or <code>author_displayname</code>.</li><li>Paginate with <code>page</code> and <code>size</code>; keep page sizes modest.</li><li>Use <code>hardware_platforms</code> to narrow the default cross-platform results.</li></ol>
          </section>

          <section id="download-guide">
            <p className="kicker">HOW TO</p>
            <h2>Download an addon ZIP</h2>
            <ol><li>Read an addon’s <code>content_id</code> from catalog results.</li><li>Navigate to <code>/api/bethesda/download?id=CONTENT_ID</code>.</li><li>The adapter finds the latest Windows manifest, downloads its files, and returns a reconstructed ZIP.</li></ol>
            <p>The archive route is memory-bound. Do not use it as a bulk mirror or bypass upstream rate and licensing constraints.</p>
          </section>

          <section id="draft-guide">
            <p className="kicker">HOW TO</p>
            <h2>Create and update a draft</h2>
            <ol><li>Authenticate in the same browser session.</li><li>POST title, overview, description, and category to <code>/api/bethesda/addons</code>.</li><li>Store the returned <code>content_id</code>.</li><li>PUT later metadata changes to <code>/api/bethesda/addons/CONTENT_ID</code>.</li></ol>
            <Code>{`const draft = await fetch("/api/bethesda/addons", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    title: "My Addon",
    overview: "A short public summary",
    description: "Full description",
    category: "User Interface"
  })
}).then(response => response.json());`}</Code>
          </section>

          <section id="upload-guide">
            <p className="kicker">HOW TO · EXPERIMENTAL</p>
            <h2>Upload a release archive</h2>
            <div className="callout warning"><strong>Keep a local copy.</strong><p>The upstream initiate/PUT/complete sequence is inferred and may change. A failed package upload does not roll back an already-created metadata draft.</p></div>
            <ol><li>Create <code>FormData</code> containing <code>archive</code>, <code>addonId</code>, <code>version</code>, and <code>note</code>.</li><li>POST it to <code>/api/bethesda/upload</code> from an authenticated session.</li><li>Inspect both HTTP status and any returned <code>phase</code>.</li><li>Verify the release in the author dashboard before considering it complete.</li></ol>
          </section>

          <section id="self-host">
            <p className="kicker">HOW TO</p>
            <h2>Self-host the complete stack</h2>
            <Code>{`git clone https://github.com/the-jolly-green-bryant/eso-addon-uploader.git
cd eso-addon-uploader
cp .env.example .env.local
npm ci
npm test
npm run dev`}</Code>
            <p>Production requires AWS credentials, a Bethesda application key, and Cloudflare DNS credentials. Review the repository README for the OIDC and SST deployment setup.</p>
          </section>

          <footer className="docs-footer">
            <p>Built in the open for ESO addon authors.</p>
            <div><a href="https://github.com/the-jolly-green-bryant/eso-addon-uploader/blob/main/SECURITY.md">Security</a><a href="https://github.com/the-jolly-green-bryant/eso-addon-uploader">Source</a></div>
          </footer>
        </article>
      </main>
    </div>
  );
}
