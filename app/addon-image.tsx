"use client";

import { useState } from "react";

const PLACEHOLDER = "/addon-placeholder.svg";

export default function AddonImage({
  imageUrl,
  title,
  className,
}: {
  imageUrl?: string;
  title: string;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  const source =
    imageUrl && imageUrl !== failedSource ? imageUrl : PLACEHOLDER;

  return (
    // Upstream images may come from any Bethesda/ESOUI CDN hostname, so Next's
    // fixed remote-image allowlist cannot safely cover the public catalog.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={source}
      alt={source === PLACEHOLDER ? "" : `${title} add-on artwork`}
      loading="lazy"
      onError={() => setFailedSource(source)}
    />
  );
}
