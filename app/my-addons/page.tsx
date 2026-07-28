import type { Metadata } from "next";
import { AddonApp } from "../page";

export const metadata: Metadata = {
  title: "My Addons — Wayrest Workshop",
  description: "Manage, edit, and upload your Bethesda ESO addons.",
  robots: { index: false, follow: false },
};

export default function MyAddonsPage() {
  return <AddonApp initialTab="mine" />;
}
