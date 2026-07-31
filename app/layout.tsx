import type { Metadata } from "next";
import { headers } from "next/headers";
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "./globals.css";
import Analytics from "./analytics";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host =
    incoming.get("x-forwarded-host") ||
    incoming.get("host") ||
    "localhost:3000";
  const protocol =
    incoming.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "ESO Addon Workshop — Discover, Build & Publish ESO Addons";
  const description =
    "Browse, download, package, and publish Elder Scrolls Online addons through an open, cross-platform community workshop.";
  return {
    metadataBase: new URL(origin),
    title,
    description,
    applicationName: "ESO Addon Workshop",
    alternates: { canonical: origin },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
      apple: "/favicon.svg",
    },
    openGraph: {
      type: "website",
      url: origin,
      siteName: "ESO Addon Workshop",
      title,
      description,
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
