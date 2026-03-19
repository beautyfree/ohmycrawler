import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { matchLink, resolveLink, shouldExcludeLink } from "../src/link.js";

describe("resolveLink", () => {
  it("deduplicates consecutive path segments", () => {
    const base = "https://yandex.com/dev/direct/doc/en/";
    expect(resolveLink("en/changelog", base)).toBe(
      "https://yandex.com/dev/direct/doc/en/changelog",
    );
  });

  it("does not collapse legitimate repeated segments", () => {
    const base = "https://yandex.com/dev/direct/doc/en/adextensions/";
    expect(resolveLink("adextensions", base)).toBe(
      "https://yandex.com/dev/direct/doc/en/adextensions/adextensions",
    );
  });

  it("resolves relative href against base", () => {
    expect(resolveLink("foo", "https://a.com/b/c/")).toBe("https://a.com/b/c/foo");
  });

  it("treats .https:// and .http:// as absolute (strip leading dot)", () => {
    const base = "https://yandex.com/dev/direct/doc/en/concepts/";
    expect(resolveLink(".https://yandex.ru/support/troubleshooting/issue", base)).toBe(
      "https://yandex.ru/support/troubleshooting/issue",
    );
    expect(resolveLink(".http://example.com/", base)).toBe("http://example.com/");
  });
});

describe("matchLink", () => {
  it("returns true when path equals link", () => {
    expect(matchLink("/a/b", "/a/b")).toBe(true);
    expect(matchLink("/", "/")).toBe(true);
  });

  it("returns true when link is path with index.html or index.htm", () => {
    expect(matchLink("/a/b", "/a/b/index.html")).toBe(true);
    expect(matchLink("/a/b", "/a/b/index.htm")).toBe(true);
    expect(matchLink("/a/b/", "/a/b/index.html")).toBe(true);
  });

  it("property: path matches itself", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (path) => {
        try {
          return matchLink(path, path) === true;
        } catch {
          return true;
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe("shouldExcludeLink", () => {
  it("returns true when link contains #", () => {
    expect(shouldExcludeLink("/page#section", [])).toBe(true);
    expect(shouldExcludeLink("/a#b", ["other"])).toBe(true);
  });

  it("returns true when link name matches exclude (exact)", () => {
    expect(shouldExcludeLink("/path/changelog", ["changelog"])).toBe(true);
    expect(shouldExcludeLink("/path/LICENSE", ["license"])).toBe(true);
  });

  it("returns true when exclude has extension and name matches", () => {
    expect(shouldExcludeLink("/path/readme.md", ["readme.md"])).toBe(true);
  });

  it("returns false when no match", () => {
    expect(shouldExcludeLink("/path/other", ["changelog"])).toBe(false);
    expect(shouldExcludeLink("/path/other", [])).toBe(false);
  });

  it("property: link containing # is always excluded", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.includes("#")),
        fc.array(fc.string()),
        (link, exclude) => {
          return shouldExcludeLink(link, exclude) === true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
