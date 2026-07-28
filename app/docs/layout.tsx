import type { Metadata } from "next";
import "./docs.css";

export const metadata: Metadata = {
  title: "Developer Docs — Wayrest Workshop",
  description: "API reference, protocol notes, and integration guides for the open-source ESO addon uploader.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
