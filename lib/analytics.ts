export function track(event: string, parameters: Record<string, string | number | boolean | undefined> = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, parameters);
}
