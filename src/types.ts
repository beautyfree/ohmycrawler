import type { RequestInit } from "node-fetch";

/**
 * Options for the web crawler.
 */
export interface CrawlOptions {
  /** Extract specific content using CSS selector */
  extract?: string;
  /** Maximum number of concurrent connections allowed */
  maxConnections: number;
  /** Path names to exclude */
  exclude: string[];
  /** Whether to stop on first error */
  breakOnError: boolean;
  /** Whether to enable logging */
  logEnabled: boolean;
  /** Fetch options */
  fetchOptions: RequestInit;
  /** Use Playwright browser (for CAPTCHA / JS-heavy sites); default false */
  useBrowser?: boolean;
  /**
   * When CAPTCHA is detected (HTTP mode): call this; if it returns RequestInit (e.g. Cookie),
   * we merge and retry the same URL. Use to open a browser for the user to solve, then return session.
   */
  onCaptcha?: (ctx: { url: string; html: string }) => Promise<RequestInit | void>;
}

/** A crawled page with URL and extracted text */
export interface Page {
  path: string;
  text: string;
}

/** Fetch function: (url, init) => Promise<response body text> */
export type FetchFn = (url: string, init?: RequestInit) => Promise<string>;

/** GitHub tree fetcher: (baseUrl, exclude) => Promise<full URLs of .md files> */
export type GetGHTreePathsFn = (
  baseUrl: URL,
  exclude: string[],
) => Promise<string[]>;
