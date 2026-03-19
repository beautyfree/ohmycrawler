import fetch from "node-fetch";
import type { RequestInit } from "node-fetch";
import type { FetchFn } from "./types.js";

const DEFAULT_INIT: RequestInit = {
  headers: {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  },
  follow: 3,
};

/**
 * Default fetch adapter: node-fetch. Caller can pass agent (e.g. HTTPS_PROXY) via options.fetchOptions.
 */
export function defaultFetchAdapter(): FetchFn {
  return async (url: string, overrides?: RequestInit) => {
    const res = await fetch(url, { ...DEFAULT_INIT, ...overrides });
    return res.text();
  };
}
