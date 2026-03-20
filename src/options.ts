import type { CrawlOptions } from "./types.js";

export type { CrawlOptions };

const DEFAULTS: CrawlOptions = {
  maxConnections: 1,
  requestDelayMs: 0,
  exclude: [],
  breakOnError: true,
  logEnabled: true,
  fetchOptions: {},
  useBrowser: false,
};

export function defaultCrawlOptions(): CrawlOptions {
  return { ...DEFAULTS };
}

export function mergeCrawlOptions(partial?: Partial<CrawlOptions>): CrawlOptions {
  const base = { ...DEFAULTS };
  if (!partial) return base;
  for (const [k, v] of Object.entries(partial) as [keyof CrawlOptions, unknown][]) {
    if (v !== undefined) (base as Record<string, unknown>)[k] = v;
  }
  return base;
}
