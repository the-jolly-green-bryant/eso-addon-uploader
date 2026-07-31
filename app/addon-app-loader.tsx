"use client";

import dynamic from "next/dynamic";

const AddonApp = dynamic(
  () => import("./addon-app").then((module) => module.AddonApp),
  {
    ssr: false,
    loading: () => (
      <main
        className="workshop-loading"
        aria-label="Loading ESO Addon Workshop"
      >
        <span className="workshop-loading-mark" aria-hidden="true">
          ESO
        </span>
        <strong>Opening the workshop…</strong>
      </main>
    ),
  },
);

export default AddonApp;
