# ESO Addon Workshop

**ESO addon publishing should be open, understandable, and available on every
platform.**

[Browse addons](https://eso-addon-uploader.bryantjames.com) ·
[Read the API research](https://docs.eso-addon-uploader.bryantjames.com) ·
[Review the source](https://github.com/the-jolly-green-bryant/eso-addon-uploader)

> ESO Addon Workshop is an independent community project. It is not affiliated
> with, endorsed by, or supported by Bethesda Softworks, ZeniMax Online
> Studios, or The Elder Scrolls Online.

## Why this project exists

ESO addon authors are currently asked to trust a closed-source, Windows-only
utility to publish their work. That creates two problems.

First, platform choice becomes a gatekeeper. Authors on macOS and Linux cannot
participate in the same workflow without finding a Windows machine, using a
virtual machine, or handing the task to someone else.

Second, trust cannot be independently verified. A publishing utility handles
account credentials, session tokens, addon archives, and unpublished metadata.
When its source and network behavior are hidden, users must accept claims about
that sensitive data without being able to inspect them.

ESO Addon Workshop exists because neither limitation is necessary. A browser can
provide a cross-platform experience, and a public implementation can make the
entire path from user action to upstream request reviewable.

## Open source is the trust model

Open source does not eliminate trust. It makes trust specific and testable.

With ESO Addon Workshop, anyone can inspect:

- where Bethesda credentials are sent;
- how authenticated sessions are stored;
- which requests are made when browsing, downloading, or publishing;
- what information is measured by analytics;
- how addon ZIP archives are reconstructed and validated;
- how the application is built and deployed.

The project intentionally keeps Bethesda credentials and session tokens out of
browser-readable storage. Passwords are not retained, application keys remain
server-side, authenticated mutations are same-origin protected, and downloads
are bounded and checked for unsafe archive paths.

That still leaves real trust boundaries. Users of the hosted service trust its
operator, GitHub Actions, AWS, Cloudflare, and Bethesda. Those boundaries are
named plainly because security claims are useful only when their limits are
also visible. Anyone who wants a different trust boundary can audit the code
and operate an independent deployment.

## Why a website

A website gives addon users and authors one consistent experience across
Windows, macOS, Linux, and mobile devices. It also makes the public catalog
searchable and indexable, gives every addon a linkable page, and removes the
need to install another privileged desktop utility merely to exchange a ZIP
file.

The goal is not to place a new proprietary middleman between creators and
Bethesda. The website is a transparent client for Bethesda's addon service.
The accompanying documentation describes the observed Bethesda API directly,
including which behavior is confirmed, observed, or inferred.

## What the project is trying to prove

ESO Addon Workshop is building toward a simple standard:

> An addon author should be able to understand exactly what will happen before
> signing in or publishing a file.

Today, the project can browse and search the public catalog, display individual
addon pages, reconstruct downloadable ZIP archives, authenticate Bethesda
authors, manage owned addons, and exercise an experimental publishing flow.

Publishing is labeled experimental because Bethesda has offered API access
without publishing a schema. The implementation is based on observed requests
and conservative inference, and it may need to evolve when upstream behavior
changes. The project will not disguise that uncertainty as a guarantee.

## Principles

- **Cross-platform by default.** Authors should not need Windows to participate.
- **Inspectability over assurances.** Important claims should be verifiable in
  code and network behavior.
- **Direct documentation.** API research should explain Bethesda's interface,
  not invent an undocumented proprietary layer.
- **Explicit uncertainty.** Observed and inferred behavior must not be presented
  as official documentation.
- **Minimal sensitive data.** Credentials, tokens, archives, and analytics
  should be handled only as required for a user-requested action.
- **No lock-in.** The source and deployment model should allow independent
  review, contribution, and operation.

## Privacy without euphemisms

The production site uses Google Analytics 4 for page views and a small set of
product events: searches, addon-detail visits, mirror visits, ZIP downloads,
successful logins, and addon draft creation or updates.

Bethesda usernames, passwords, session tokens, and archive contents are not
included in analytics events. Search terms are measured because they reveal
whether the catalog works well, so users should not enter personal information
into search.

## Where the practical documentation lives

This README explains why ESO Addon Workshop should exist. Installation,
architecture, deployment, API findings, and contribution guidance belong in
the [developer documentation](https://docs.eso-addon-uploader.bryantjames.com),
where they can be maintained as task-oriented references.

Security concerns can be reported through
[`SECURITY.md`](https://github.com/the-jolly-green-bryant/eso-addon-uploader/blob/main/SECURITY.md).
The project is available under the
[`MIT License`](https://github.com/the-jolly-green-bryant/eso-addon-uploader/blob/main/LICENSE).
