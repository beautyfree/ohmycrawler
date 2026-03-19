/**
 * Heuristic: treat response as CAPTCHA/anti-bot page.
 * Used to skip yielding such pages and not follow their links.
 */
export function isCaptchaContent(htmlOrText: string): boolean {
  const s = htmlOrText.slice(0, 10000);
  return (
    s.includes("Are you not a robot") ||
    s.includes("captcha-backgrounds") ||
    s.includes("smart-captcha")
  );
}

/**
 * Heuristic: treat response as an error page (404, etc.) so we don't yield it.
 */
export function isErrorPage(htmlOrText: string): boolean {
  const s = htmlOrText.slice(0, 8000);
  return (
    (s.includes("404") && (s.includes("Page doesn't exist") || s.includes("not found"))) ||
    /<title[^>]*>\s*404\s/i.test(s) ||
    /\b404\s+Error\b/i.test(s)
  );
}
