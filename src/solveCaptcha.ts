import { chromium } from "playwright";
import type { RequestInit } from "node-fetch";
import { createInterface } from "node:readline";

/**
 * Opens a visible browser at the CAPTCHA URL; after the user solves it and presses Enter,
 * returns the Cookie header from the browser so the crawler can retry with the same session.
 */
export async function solveCaptchaInBrowser(ctx: {
  url: string;
  html: string;
}): Promise<RequestInit | void> {
  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(ctx.url, { waitUntil: "domcontentloaded" });
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) => {
      rl.question(
        "Solve the CAPTCHA in the browser, then press Enter here to continue… ",
        resolve,
      );
    });
    rl.close();
    if (answer !== undefined) {
      const cookies = await context.cookies();
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
      if (cookieHeader) {
        return { headers: { Cookie: cookieHeader } as Record<string, string> };
      }
    }
  } finally {
    await browser.close();
  }
}
