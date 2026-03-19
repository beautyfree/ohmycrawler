import { describe, it, expect } from "vitest";
import {
  crawlWebsite,
  type CrawlOptions,
  type FetchFn,
  type GetGHTreePathsFn,
} from "../src/crawl.js";
import type { Page } from "../src/types.js";

describe("crawlWebsite", () => {
  it("property: no duplicate paths in yielded pages", async () => {
    const base = "https://example.com/";
    const fetchFn: FetchFn = async (url) => {
      if (url === base || url === base + "index.html") {
        return `<html><body><a href="${base}">home</a><a href="${base}page">page</a></body></html>`;
      }
      if (url === base + "page" || url === base + "page/") {
        return `<html><body><a href="${base}">back</a></body></html>`;
      }
      return "";
    };
    const getGHTreePaths: GetGHTreePathsFn = async () => [];
    const options: Partial<CrawlOptions> = {
      maxConnections: 5,
      exclude: [],
      breakOnError: true,
      logEnabled: false,
      fetchOptions: {},
    };
    const pages: Page[] = [];
    for await (const p of crawlWebsite(base, options, fetchFn, getGHTreePaths)) {
      pages.push(p);
    }
    const paths = pages.map((p) => p.path);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  it("yields pages with unique paths for mock with same-origin links", async () => {
    const base = "https://site.com/";
    const fetchFn: FetchFn = async (url) => {
      if (url.startsWith(base) && (url === base || url === base + "a" || url === base + "b")) {
        return "<html><body><p>content</p></body></html>";
      }
      return "";
    };
    const pages: Page[] = [];
    for await (const p of crawlWebsite(base, { logEnabled: false }, fetchFn)) {
      pages.push(p);
    }
    const paths = pages.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
