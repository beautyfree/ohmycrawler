import { URL } from "node:url";

/**
 * Normalize start URL: strip search/hash and ensure pathname ends with /
 * for use as base when resolving relative links.
 */
export function normalizeStartUrl(startUrl: string): string {
  const parsedUrl = new URL(startUrl);
  parsedUrl.search = "";
  parsedUrl.hash = "";
  const lastSlashIndex = parsedUrl.pathname.lastIndexOf("/");
  if (lastSlashIndex !== -1) {
    parsedUrl.pathname = parsedUrl.pathname.substring(0, lastSlashIndex + 1);
  }
  return parsedUrl.toString();
}
