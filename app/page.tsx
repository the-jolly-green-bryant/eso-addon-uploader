import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const requestedPlatform = (await searchParams).platform;
  redirect(requestedPlatform === "pc-mac" ? "/pc-mac" : "/console");
}
