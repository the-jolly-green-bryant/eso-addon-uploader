import type { Metadata } from "next";
import "./docs.css";

export const metadata: Metadata = {
  title: "Developer API — ESO Addon Workshop",
  description:
    "API reference, protocol notes, and integration guides for the publicly inspectable ESO addon uploader.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
