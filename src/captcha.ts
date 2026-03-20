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
