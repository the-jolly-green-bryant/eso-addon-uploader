"use client";

import { track } from "../../../lib/analytics";

export default function TrackedActions({
  contentId,
  title,
  mirrorUrl,
  downloadUrl,
}: {
  contentId: string;
  title: string;
  mirrorUrl: string;
  downloadUrl: string;
}) {
  return (
    <div className="detail-actions">
      <a
        className="mirror-link"
        href={mirrorUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => track("addon_mirror_click", { addon_id: contentId, addon_title: title })}
      >
        &lt;/&gt; View source mirror
      </a>
      <a
        className="download"
        href={downloadUrl}
        download
        onClick={() => track("file_download", { addon_id: contentId, addon_title: title, file_extension: "zip" })}
      >
        ↓ Download latest ZIP
      </a>
    </div>
  );
}
