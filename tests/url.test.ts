import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { normalizeStartUrl } from "../src/url.js";

describe("normalizeStartUrl", () => {
  it("strips search and hash from URL", () => {
    const out = normalizeStartUrl("https://example.com/path/?a=1#anchor");
    const u = new URL(out);
    expect(u.search).toBe("");
    expect(u.hash).toBe("");
  });

  it("ensures pathname ends with slash when path has segments", () => {
    expect(normalizeStartUrl("https://example.com")).toMatch(/\/$/);
    expect(normalizeStartUrl("https://example.com/")).toMatch(/\/$/);
    expect(normalizeStartUrl("https://example.com/a")).toMatch(/\/$/);
    expect(normalizeStartUrl("https://example.com/a/b")).toMatch(/\/$/);
  });

  it("property: output has no search or hash", () => {
    fc.assert(
      fc.property(
        fc.webUrl({ validSchemes: ["https"], authority: "example.com" }),
        (url) => {
          const out = normalizeStartUrl(url);
          const u = new URL(out);
          return u.search === "" && u.hash === "";
        },
      ),
      { numRuns: 200 },
    );
  });

  it("property: when path has segments, pathname ends with slash", () => {
    fc.assert(
      fc.property(
        fc.webUrl({ validSchemes: ["https"], authority: "example.com" }).filter(
          (u) => new URL(u).pathname.length > 1,
        ),
        (url) => {
          const out = normalizeStartUrl(url);
          const u = new URL(out);
          return u.pathname.endsWith("/");
        },
      ),
      { numRuns: 200 },
    );
  });
});
