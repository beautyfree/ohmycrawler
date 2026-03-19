/** Remove consecutive duplicate path segments (e.g. /en/en/ -> /en/) */
function dedupeConsecutivePathSegments(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const out: string[] = [];
  for (const seg of segments) {
    if (out[out.length - 1] === seg) {
      // Only collapse duplicates for locale-like segments (e.g. en/en, ru/ru).
      if (/^[a-z]{2}(-[a-z]{2})?$/i.test(seg)) continue;
    }
    out.push(seg);
  }
  return "/" + out.join("/");
}

/** Strip leading dot before protocol so ".https://..." is resolved as absolute URL */
function normalizeHref(href: string): string {
  const t = href.trim();
  if (t.startsWith(".https://") || t.startsWith(".http://")) return t.slice(1);
  return href;
}

/**
 * Resolve a link (href) against a base URL; returns the absolute URL string.
 * Deduplicates path segments. Fixes broken hrefs like ".https://..." (leading dot).
 */
export function resolveLink(href: string, baseUrl: string): string {
  const normalized = normalizeHref(href);
  const url = new URL(normalized, baseUrl);
  const hadTrailingSlash = url.pathname.endsWith("/");
  let pathname = dedupeConsecutivePathSegments(url.pathname);
  if (hadTrailingSlash) {
    if (!pathname.endsWith("/")) pathname += "/";
  } else {
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  }
  url.pathname = pathname;
  return url.toString();
}

/** Normalize path/link to directory form (trailing slash, no index.html) for comparison */
function norm(pathOrLink: string): string {
  return (
    pathOrLink
      .replace(/\/index\.(html|htm)$/, "/")
      .replace(/\/$/, "") + "/"
  );
}

/**
 * Whether a known path and a discovered link refer to the same resource
 * (including index.html/index.htm normalization).
 */
export function matchLink(path: string, link: string): boolean {
  return path === link || norm(path) === norm(link);
}

/**
 * Whether the link should be excluded based on exclude list (hash fragments
 * and name/extension matches).
 */
export function shouldExcludeLink(link: string, exclude: string[]): boolean {
  if (link.includes("#")) {
    return true;
  }
  const parts = link.replace(/\/$/, "").split("/");
  const name = (parts[parts.length - 1] || "").toLowerCase();

  for (const excludeName of exclude) {
    let cond = false;
    if (/\.[^.]+$/.test(excludeName)) {
      cond = excludeName.toLowerCase() === name;
    } else {
      cond =
        excludeName.toLowerCase() === name.replace(/\.[^.]+$/, "");
    }
    if (cond) {
      return true;
    }
  }
  return false;
}
