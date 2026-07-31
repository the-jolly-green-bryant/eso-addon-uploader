import type { Metadata } from "next";
import AddonApp from "../addon-app-loader";

export const metadata: Metadata = {
  title: "My Addons — ESO Addon Workshop",
  description: "Manage, edit, and upload your Bethesda ESO addons.",
  robots: { index: false, follow: false },
};

export default function MyAddonsPage() {
  return <AddonApp initialTab="mine" />;
}
