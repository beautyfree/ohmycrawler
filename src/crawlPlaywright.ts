import { PlaywrightCrawler } from "crawlee";
import TurndownService from "turndown";
import { URL } from "node:url";

import { isCaptchaContent, isErrorPage } from "./captcha.js";
import { normalizeStartUrl } from "./url.js";
import { shouldExcludeLink } from "./link.js";
import { mergeCrawlOptions } from "./options.js";
import type { CrawlOptions, Page } from "./types.js";

const turndownService = new TurndownService();
turndownService.remove("script");

export type { CrawlOptions, Page };

/**
 * Crawl a website using Playwright (real browser). Use for CAPTCHA or JS-heavy sites.
 * Set headless: false in launchOptions to solve CAPTCHAs manually in the visible window.
 * Yields the same Page shape as the HTTP crawler.
 */
export async function* crawlWebsitePlaywright(
  startUrl: string,
  options_: Partial<CrawlOptions> | undefined,
): AsyncGenerator<Page, void, unknown> {
  const options = mergeCrawlOptions(options_);
  const normalizedStart = normalizeStartUrl(startUrl);
  const results: Page[] = [];

  const crawler = new PlaywrightCrawler({
    maxConcurrency: options.maxConnections,
    maxRequestsPerCrawl: 10000,
    requestHandlerTimeoutSecs: 60,
    launchContext: {
      launchOptions: {
        headless: false,
      },
    },
    async requestHandler({ request, page, enqueueLinks, log }) {
      const url = request.loadedUrl ?? request.url;
      if (options.logEnabled) {
        log.info(`Crawled ${url}`);
      }

      let html: string;
      if (options.extract) {
        const el = await page.$(options.extract);
        html = el ? await el.innerHTML() : await page.content();
      } else {
        html = await page.content();
      }
      if (isCaptchaContent(html ?? "")) {
        if (options.logEnabled) log.info(`CAPTCHA page skipped: ${url}`);
        return;
      }
      const text = turndownService.turndown(html ?? "");
      if (isErrorPage(text) || isErrorPage(html ?? "")) {
        if (options.logEnabled) log.info(`Error page skipped: ${url}`);
        return;
      }
      if (text.trim() !== "") {
        results.push({ path: url, text });
      }

      const hrefs = await page.$$eval("a[href]", (anchors) =>
        anchors.map((a) => (a as HTMLAnchorElement).href),
      );
      const toEnqueue: string[] = [];
      for (const href of hrefs) {
        if (!href || href.startsWith("#")) continue;
        try {
          // In Playwright mode we read a.href (already absolute and browser-resolved).
          const resolved = href;
          if (!resolved.startsWith(normalizedStart)) continue;
          const pathname = new URL(resolved).pathname;
          if (shouldExcludeLink(pathname, options.exclude)) continue;
          toEnqueue.push(resolved);
        } catch {
          /* skip invalid URLs */
        }
      }
      if (toEnqueue.length > 0) {
        await enqueueLinks({
          urls: [...new Set(toEnqueue)],
        });
      }
    },
    failedRequestHandler({ request }, error) {
      if (options.breakOnError) throw error;
      if (options.logEnabled) console.error(`Request ${request.url} failed:`, error);
    },
  });

  await crawler.run([startUrl]);

  if (options.logEnabled) {
    console.log("✨ Crawl completed");
  }
  yield* results;
}
