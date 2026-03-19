import { crawlWebsite as crawlWebsiteImpl } from "./crawl.js";
import { crawlWebsitePlaywright } from "./crawlPlaywright.js";
import { defaultFetchAdapter } from "./fetchAdapter.js";
import { getGHTreePaths, IS_GITHUB_REPO } from "./github.js";
import type { CrawlOptions, Page } from "./types.js";

export type { CrawlOptions, Page };
export { solveCaptchaInBrowser } from "./solveCaptcha.js";

/**
 * Crawl a website or GitHub tree and yield { path, text } pages.
 * Uses default fetch adapter and GitHub tree fetcher when applicable.
 * Set options.useBrowser = true (or --browser in CLI) to use Playwright for CAPTCHA / JS-heavy sites.
 */
export async function* crawlWebsite(
  startUrl: string,
  options?: Partial<CrawlOptions>,
): AsyncGenerator<Page, void, unknown> {
  if (options?.useBrowser && !IS_GITHUB_REPO.test(startUrl)) {
    yield* crawlWebsitePlaywright(startUrl, options);
    return;
  }
  const fetchFn = defaultFetchAdapter();
  yield* crawlWebsiteImpl(startUrl, options, fetchFn, getGHTreePaths);
}
