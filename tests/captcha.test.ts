import { describe, it, expect } from "vitest";
import { isCaptchaContent } from "../src/captcha.js";

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

