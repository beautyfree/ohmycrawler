import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  defaultCrawlOptions,
  mergeCrawlOptions,
  type CrawlOptions,
} from "../src/options.js";

describe("defaultCrawlOptions", () => {
  it("returns all required fields defined", () => {
    const opts = defaultCrawlOptions();
    expect(opts.maxConnections).toBe(1);
    expect(opts.exclude).toEqual([]);
    expect(opts.breakOnError).toBe(true);
    expect(opts.logEnabled).toBe(true);
    expect(opts.fetchOptions).toEqual({});
    expect(opts.useBrowser).toBe(false);
    expect(typeof opts.maxConnections).toBe("number");
    expect(Array.isArray(opts.exclude)).toBe(true);
  });
});

describe("mergeCrawlOptions", () => {
  it("overrides defaults with partial", () => {
    const merged = mergeCrawlOptions({ maxConnections: 10, exclude: ["x"] });
    expect(merged.maxConnections).toBe(10);
    expect(merged.exclude).toEqual(["x"]);
    expect(merged.breakOnError).toBe(true);
  });

  it("property: merged options always have required fields non-undefined", () => {
    fc.assert(
      fc.property(
        fc.record({
          maxConnections: fc.option(fc.integer({ min: 1, max: 100 }), {
            nil: undefined,
          }),
          exclude: fc.option(fc.array(fc.string()), { nil: undefined }),
          breakOnError: fc.option(fc.boolean(), { nil: undefined }),
          logEnabled: fc.option(fc.boolean(), { nil: undefined }),
          fetchOptions: fc.option(fc.record({}), { nil: undefined }),
        }),
        (partial) => {
          const merged = mergeCrawlOptions(partial as Partial<CrawlOptions>);
          return (
            typeof merged.maxConnections === "number" &&
            Array.isArray(merged.exclude) &&
            typeof merged.breakOnError === "boolean" &&
            typeof merged.logEnabled === "boolean" &&
            typeof merged.fetchOptions === "object"
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
