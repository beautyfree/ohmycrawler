# ohmycrawler

*Crawl websites and GitHub trees to generate knowledge files for RAG*

[![CI](https://github.com/beautyfree/ohmycrawler/actions/workflows/ci.yaml/badge.svg?style=flat-square)](https://github.com/beautyfree/ohmycrawler/actions)
[![npm version](https://img.shields.io/npm/v/ohmycrawler?style=flat-square)](https://www.npmjs.com/package/ohmycrawler)
[![Node.js](https://img.shields.io/badge/Node.js->=18-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [CAPTCHA flow](#captcha-flow) • [API](#api)

A CLI and library that crawls a site from a start URL, converts pages to Markdown, and outputs either a single JSON array or one file per page. Supports GitHub tree URLs (Markdown via API), HTTP crawling with CAPTCHA handoff, and presets for repeatable crawl configs.

## Features

- **Reliable default mode** — HTTP (Cheerio) by default. For sites that show CAPTCHA on first load (e.g. Yandex), the built-in solve-captcha flow opens a browser, then resumes with the same session cookies.
- **Flexible output** — stdout JSON, single JSON file (path with extension), or directory of `.md` files (path without extension).
- **GitHub trees** — Detects `github.com/.../tree/...` and fetches Markdown files via the GitHub API.
- **CAPTCHA handling** — In HTTP mode (default) a one-off browser can open to solve CAPTCHA, then crawl continues with the same session (on by default, disable with `--no-solve-captcha`).
- **Presets** — Reusable options (e.g. GitHub Wiki) via `--preset`; custom presets in `~/.ohmycrawler.json`.
- **Programmatic API** — Async generator `crawlWebsite(url, options)` for integration in Node apps.

## Installation

Run with [npx](https://docs.npmjs.com/cli/v8/commands/npx) (no install required):

```bash
npx ohmycrawler [options] <startUrl> [outPath]
```

Optional: install globally for a shorter command:

```bash
npm install -g ohmycrawler
```

## Usage

```bash
# Output to stdout (JSON array of { path, text })
npx ohmycrawler https://example.com/docs/

# Single JSON file (outPath has an extension)
npx ohmycrawler https://example.com/docs/ knowledge.json

# Directory of .md files (outPath has no extension)
npx ohmycrawler https://example.com/docs/ pages
npx ohmycrawler https://example.com/docs/ pages/
```

Output format:

- **stdout** — JSON array of `{ "path": "<url>", "text": "<markdown>" }`.
- **File** — Same array written to the given path (e.g. `knowledge.json`). Parent directory is created if needed.
- **Directory** — One `.md` file per page under the given folder; paths mirror the site structure.

### Options

| Option | Description |
|--------|-------------|
| `--preset <name>` | Use a preset (default: `auto`). |
| `-c, --max-connections <n>` | Max concurrent connections. |
| `-e, --exclude <paths>` | Comma-separated paths to exclude. |
| `--extract <selector>` | CSS selector to extract (default: full body). |
| `--no-log` | Disable progress logging. |
| `--no-solve-captcha` | Disable opening browser to solve CAPTCHA in HTTP mode. |

### GitHub tree

For `https://github.com/<org>/<repo>/tree/<branch>/<path>` the crawler uses the GitHub API and returns Markdown content. No browser needed.

```bash
npx ohmycrawler https://github.com/beautyfree/mynotes/tree/main/src/languages/ knowledge.json
```

## CAPTCHA flow

By default the crawler uses **HTTP** (Cheerio). For sites that redirect to CAPTCHA on first load (e.g. Yandex), HTTP + solve-captcha works: the crawler opens a one-off browser for you to solve, then retries with cookies and continues.

```bash
# Default: HTTP, solve-captcha on — works for Yandex and similar
npx ohmycrawler https://yandex.com/dev/direct/doc/en/ api-docs.json
```

> [!NOTE]
> GitHub tree URLs always use the HTTP API.

When a CAPTCHA is detected in **HTTP mode**, the crawler opens a browser for you to solve it, then continues with the same session. This is **on by default**; use `--no-solve-captcha` to disable.

## Presets

Presets define reusable crawl options (e.g. `exclude`, `extract`). With `--preset auto`, the crawler picks a preset when the start URL matches a preset’s `test` regex. Predefined presets live in `src/preset.ts`; you can add more in `~/.ohmycrawler.json`.

Example for GitHub Wiki:

```bash
npx ohmycrawler https://github.com/beautyfree/repo/wiki wiki.json --preset github-wiki
# or
npx ohmycrawler https://github.com/beautyfree/repo/wiki wiki.json --preset auto
```

Custom preset in `~/.ohmycrawler.json`:

```json
[
  {
    "name": "my-preset",
    "test": "example\\.com/docs",
    "options": {
      "exclude": ["archive"],
      "extract": "#main"
    }
  }
]
```

## API

Use the async generator in code:

```js
import { crawlWebsite, solveCaptchaInBrowser } from 'ohmycrawler';

// Default: HTTP, CAPTCHA solver on
for await (const page of crawlWebsite('https://example.com/')) {
  console.log(page.path, page.text.slice(0, 100));
}

// Playwright for JS-heavy sites
for await (const page of crawlWebsite('https://example.com/', { useBrowser: true })) {
  console.log(page.path);
}

// HTTP with explicit CAPTCHA handler
for await (const page of crawlWebsite('https://example.com/', { onCaptcha: solveCaptchaInBrowser })) {
  console.log(page.path);
}
```

`crawlWebsite(startUrl, options?)` yields `{ path: string, text: string }`. Options include `useBrowser`, `onCaptcha`, `extract`, `exclude`, `maxConnections`, `fetchOptions`, and others (see `CrawlOptions` in the package types).
