# Security policy

Please report vulnerabilities privately through GitHub's **Security → Report a
vulnerability** flow. Do not open a public issue containing credentials,
session tokens, private addon archives, or an exploitable proof of concept.

## Credential handling

- Bethesda credentials are sent over HTTPS to this application's same-origin
  server route, used for authentication, and are not persisted by the app.
- Session tokens are kept in `HttpOnly`, `Secure`, `SameSite=Lax` cookies.
- `BETHESDA_APP_KEY` is a server-side deployment secret and must never use a
  `NEXT_PUBLIC_` prefix.
- Logs and bug reports must redact passwords, application keys, cookies,
  authorization headers, presigned upload URLs, and session tokens.

This is an independent, unofficial client. Users should use a unique Bethesda
password and review the source and deployment they choose to trust.
