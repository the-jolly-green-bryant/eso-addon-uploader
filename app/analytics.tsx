"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

function RouteAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!measurementId || typeof window.gtag !== "function") return;
    const query = searchParams.toString();
    window.gtag("config", measurementId, {
      page_path: `${pathname}${query ? `?${query}` : ""}`,
    });
  }, [pathname, searchParams]);

  return null;
}

export default function Analytics() {
  if (!measurementId) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
      <Suspense fallback={null}><RouteAnalytics /></Suspense>
    </>
  );
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
