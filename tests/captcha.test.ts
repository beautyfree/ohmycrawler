import { describe, it, expect } from "vitest";
import { isCaptchaContent, isErrorPage } from "../src/captcha.js";

describe("isCaptchaContent", () => {
  it("returns true for Yandex Smart Captcha page", () => {
    expect(
      isCaptchaContent("Are you not a robot?@media only screen and (min-width:651px)"),
    ).toBe(true);
    expect(isCaptchaContent("foo captcha-backgrounds.s3.yandex.net bar")).toBe(true);
    expect(isCaptchaContent("Theme_root_default{--smart-captcha-background")).toBe(true);
  });

  it("returns false for normal page content", () => {
    expect(isCaptchaContent("<h1>API Documentation</h1><p>Welcome</p>")).toBe(false);
    expect(isCaptchaContent("")).toBe(false);
  });
});

describe("isErrorPage", () => {
  it("returns true for Yandex 404 page", () => {
    expect(
      isErrorPage("404\n\n404 Error. Page doesn't exist\n\nSearch with Yandex"),
    ).toBe(true);
    expect(isErrorPage("<title>404</title> Page not found")).toBe(true);
  });

  it("returns false for normal content", () => {
    expect(isErrorPage("<h1>adextensions</h1><p>API for ad extensions</p>")).toBe(false);
    expect(isErrorPage("")).toBe(false);
  });
});
