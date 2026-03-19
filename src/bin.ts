#!/usr/bin/env node

import { program } from "commander";
import { RequestInit } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import path from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { CrawlOptions, Page, crawlWebsite } from "./index.js";
import PRESET_LIST, { Preset } from "./preset.js";
import { solveCaptchaInBrowser } from "./solveCaptcha.js";

async function main() {
  const { preset, maxConnections, exclude = [], extract, log, solveCaptcha } =
    program.opts();
  const [startUrl, outPath] = program.args;
  const fetchOptions: RequestInit = {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
    follow: 3,
  };
  if (startUrl.startsWith("https://") && process.env["HTTPS_PROXY"]) {
    fetchOptions.agent = new HttpsProxyAgent(process.env["HTTPS_PROXY"]);
  }
  let options: Partial<CrawlOptions> = {
    maxConnections,
    exclude,
    extract,
    logEnabled: !!log,
    fetchOptions,
    onCaptcha: solveCaptcha ? solveCaptchaInBrowser : undefined,
  };
  applyPreset(preset, startUrl, options);
  if (!options.maxConnections) {
    options.maxConnections = 1;
  }
  if (!outPath) {
    options.logEnabled = false;
  }
  if (options.logEnabled) {
    console.log(
      `⚙️  maxConnections=${
        options.maxConnections
      } exclude='${options.exclude.join(",")}' extract='${
        options.extract || ""
      }'${options.useBrowser ? " browser=Playwright" : ""}${options.onCaptcha ? " solve-captcha=on" : ""}`,
    );
  }
  const pages: Page[] = [];
  for await (const page of crawlWebsite(startUrl, options)) {
    pages.push(page);
  }
  const data = JSON.stringify(pages, null, 2);
  if (outPath) {
    if (isOutputPathFile(outPath)) {
      mkdirSync(path.dirname(outPath), { recursive: true });
      writeFileSync(outPath, data);
    } else {
      const dir = outPath.replace(/[/\\]+$/, "") || ".";
      for (const page of pages) {
        let filePath = page.path.replace(/(\/|\.html)$/, "");
        filePath = path.join(dir, new URL(filePath).pathname + ".md");
        mkdirSync(path.dirname(filePath), { recursive: true });
        writeFileSync(filePath, page.text);
      }
    }
  } else {
    console.log(data);
  }
}

function applyPreset(
  preset: string,
  startUrl: string,
  options: Partial<CrawlOptions>,
) {
  let presetOptions: Preset["options"] | undefined;
  let presets = loadPresets();
  if (preset === "auto") {
    presetOptions = presets.find((p) => new RegExp(p.test).test(startUrl))
      ?.options;
  } else if (preset) {
    presetOptions = presets.find((p) => p.name === preset)?.options;
  }
  if (presetOptions) {
    if (presetOptions.maxConnections && !options.maxConnections) {
      options.maxConnections = presetOptions.maxConnections;
    }
    if (presetOptions.exclude?.length && !options.exclude?.length) {
      options.exclude = presetOptions.exclude;
    }
    if (presetOptions.extract && !options.extract) {
      options.extract = presetOptions.extract;
    }
    if (
      presetOptions.headers &&
      Object.getPrototypeOf(presetOptions.headers) === Object.prototype
    ) {
      options.fetchOptions.headers = {
        ...options.fetchOptions.headers,
        ...presetOptions.headers,
      };
    }
  }
}

function loadPresets(): Preset[] {
  const homeDir = process.env.HOME;
  const filePath = path.join(homeDir, ".ohmycrawler.json");
  try {
    const data = readFileSync(filePath, "utf-8");

    const jsonData = JSON.parse(data);

    if (Array.isArray(jsonData)) {
      return [...jsonData, ...PRESET_LIST];
    }
  } catch {
    return PRESET_LIST;
  }
}

/** If outPath has a file extension (e.g. .json), treat as single file; otherwise as directory. */
function isOutputPathFile(outPath: string): boolean {
  const base = outPath.replace(/[/\\]+$/, "") || ".";
  return path.extname(base) !== "";
}

program
  .name("ohmycrawler")
  .description(
    `Crawl a website to generate knowledge file for RAG
    
Examples:
   ohmycrawler https://beautyfree.github.io/mynotes/languages/
   ohmycrawler https://beautyfree.github.io/mynotes/languages/ data.json
   ohmycrawler https://beautyfree.github.io/mynotes/languages/ pages/
   ohmycrawler https://github.com/beautyfree/mynotes/tree/main/src/languages/`,
  )
  .argument(
    "<startUrl>",
    "The URL to start crawling from. Don't forget trailing slash. [required]",
  )
  .argument("[outPath]", "The output path. If omitted, output to stdout")
  .option("--preset <value>", "Use predefined crawl options", "auto")
  .option(
    "-c, --max-connections <int>",
    "Maximum concurrent connections when crawling the pages",
    parseInt,
  )
  .option(
    "-e, --exclude <values>",
    "Comma-separated list of path names to exclude from crawling",
    (value: string) => value.split(","),
  )
  .option(
    "--extract <css-selector>",
    "Extract specific content using a CSS selector, If omitted, extract all content",
  )
  .option("--no-log", "Disable logging")
  .option(
    "--no-solve-captcha",
    "Disable opening browser to solve CAPTCHA when detected (HTTP mode only)",
  )
  .version("1.6.0");

program.parse();

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
