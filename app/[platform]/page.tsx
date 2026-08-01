import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AddonApp from "../addon-app-loader";
import type { AddonPlatform } from "../addon-app";

const validPlatforms = new Set<AddonPlatform>(["console", "pc-mac"]);

async function platformParam(
  params: Promise<{ platform: string }>,
): Promise<AddonPlatform> {
  const { platform } = await params;
  if (!validPlatforms.has(platform as AddonPlatform)) notFound();
  return platform as AddonPlatform;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platform: string }>;
}): Promise<Metadata> {
  const platform = await platformParam(params);
  const label = platform === "pc-mac" ? "PC & Mac" : "Console";
  return {
    title: `${label} ESO Addons — ESO Addon Workshop`,
    description: `Browse and search ${label} Elder Scrolls Online addons.`,
    alternates: { canonical: `/${platform}` },
  };
}

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const platform = await platformParam(params);
  return <AddonApp platform={platform} />;
}
