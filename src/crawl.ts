import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { URL } from "node:url";
import type { RequestInit } from "node-fetch";

import { mergeCrawlOptions } from "./options.js";
import { normalizeStartUrl } from "./url.js";
import { matchLink, resolveLink, shouldExcludeLink } from "./link.js";
import { IS_GITHUB_REPO } from "./github.js";
import type { CrawlOptions, Page, FetchFn, GetGHTreePathsFn } from "./types.js";

const turndownService = new TurndownService();
turndownService.remove("script");

import { isCaptchaContent } from "./captcha.js";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export type { CrawlOptions, Page, FetchFn, GetGHTreePathsFn };

/**
 * Crawl a website or GitHub tree and yield { path, text } pages.
 * Uses injectable fetchFn and optional getGHTreePaths for GitHub mode.
 */
export async function* crawlWebsite(
  startUrl: string,
  options_: Partial<CrawlOptions> | undefined,
  fetchFn: FetchFn,
  getGHTreePaths?: GetGHTreePathsFn,
): AsyncGenerator<Page, void, unknown> {
  const options = mergeCrawlOptions(options_);
  const startUrlObj = new URL(startUrl);
  type Queued = { path: string; referrer?: string };
  let queue: Queued[] = [{ path: startUrlObj.pathname }];
  const normalizedStart = normalizeStartUrl(startUrl);

  if (IS_GITHUB_REPO.test(startUrl) && getGHTreePaths) {
    const ghPaths = await getGHTreePaths(startUrlObj, options.exclude);
    queue = ghPaths.map((path) => ({ path }));
  }

  const sessionOverrides: RequestInit = {};
  let index = 0;
  while (index < queue.length) {
    const batch = queue.slice(index, index + options.maxConnections);
    const promises = batch.map(({ path, referrer }) =>
      crawlPage(normalizedStart, path, options, fetchFn, sessionOverrides, referrer),
    );
    const results = await Promise.all(promises);

    for (const { links, text, path } of results) {
      const pageUrl = new URL(path, startUrlObj).toString();
      if (text !== "") {
        yield {
          path: pageUrl,
          text,
        };
      }
      for (const link of links) {
        if (!queue.some((q) => matchLink(q.path, link))) {
          queue.push({ path: link, referrer: pageUrl });
        }
      }
    }
    index += batch.length;
    if (options.requestDelayMs > 0 && index < queue.length) {
      // Throttle between batches to reduce pressure on the target server.
      await sleep(options.requestDelayMs);
    }
  }
  if (options.logEnabled) {
    console.log("✨ Crawl completed");
  }
}

async function crawlPage(
  startUrl: string,
  path: string,
  options: CrawlOptions,
  fetchFn: FetchFn,
  sessionOverrides: RequestInit,
  referrer?: string,
): Promise<{ path: string; text: string; links: string[] }> {
  const location = new URL(path, startUrl).toString();
  const fromMsg = referrer ? ` (linked from ${referrer})` : "";
  const mergedFetchOptions = (): RequestInit => ({
    ...options.fetchOptions,
    ...sessionOverrides,
    headers: {
      ...options.fetchOptions?.headers,
      ...(sessionOverrides?.headers as Record<string, string>),
    },
  });

  let html = "";
  let status: number | undefined;
  try {
    const res = await fetchFn(location, mergedFetchOptions());
    html = res.text;
    status = res.status;
  } catch (err) {
    if (options.breakOnError) throw err;
    if (options.logEnabled) console.error(err);
  }

  const links: string[] = [];
  if (IS_GITHUB_REPO.test(startUrl)) {
    return { path, text: html, links };
  }
  if (isCaptchaContent(html) && options.onCaptcha) {
    if (options.logEnabled) {
      console.warn(`⚠️ CAPTCHA at ${location}${fromMsg} — waiting for you to solve it…`);
    }
    const overrides = await options.onCaptcha({ url: location, html });
    if (overrides && typeof overrides === "object") {
      const existingHeaders = (sessionOverrides.headers as Record<string, string>) ?? {};
      const newHeaders = (overrides.headers as Record<string, string>) ?? {};
      Object.assign(sessionOverrides, overrides, {
        headers: { ...existingHeaders, ...newHeaders },
      });
      try {
        const res = await fetchFn(location, mergedFetchOptions());
        html = res.text;
        status = res.status;
      } catch (err) {
        if (options.breakOnError) throw err;
        if (options.logEnabled) console.error(err);
      }
    }
  }
  if (isCaptchaContent(html)) {
    if (options.logEnabled) console.warn(`⚠️ CAPTCHA page skipped: ${location}${fromMsg}`);
    return { path, text: "", links: [] };
  }

  const $ = cheerio.load(html);
  const baseHref = $("base[href]").attr("href");
  const linkBase = baseHref ? resolveLink(baseHref, location) : location;
  $("a").each((_, element) => {
    try {
      const href = $(element).attr("href");
      if (!href || href.startsWith("#")) return;
      const resolved = resolveLink(href, linkBase);
      const parsedUrl = new URL(resolved);
      if (parsedUrl.toString().startsWith(startUrl)) {
        const link = parsedUrl.pathname;
        if (!shouldExcludeLink(link, options.exclude)) links.push(link);
      }
    } catch {
      /* ignore invalid href */
    }
  });

  let text: string = html;
  if (options.extract) {
    const extracted = $(options.extract)?.html();
    if (extracted != null) text = extracted;
  }
  text = turndownService.turndown(text ?? "");
  // Skip only when we explicitly know it's a 404 from HTTP status.
  if (status === 404) {
    if (options.logEnabled) console.warn(`⚠️ Error page skipped: ${location}${fromMsg}`);
    return { path, text: "", links: [] };
  }

  if (options.logEnabled) console.log(`🚀 Crawled ${location}`);
  return {
    path,
    text,
    links: [...new Set(links)],
  };
}
