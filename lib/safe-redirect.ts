export function safeRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://kira.local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
