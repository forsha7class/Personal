#!/usr/bin/env node
/**
 * DIKA/OS QA suite.
 *
 * Usage:
 *   python3 -m http.server 8899 &      # serve the repository root
 *   node tests/qa.mjs
 *
 * Checks routes, metadata, internal links, public-safe content and asset
 * integrity over HTTP. If playwright-core is resolvable it also runs the
 * browser checks: responsive overflow, console errors, no-JS rendering,
 * reduced motion, keyboard access and terminal behaviour.
 */

import { execSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const BASE = (process.env.QA_BASE || "http://127.0.0.1:8899").replace(/\/$/, "");
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const icon = ok ? "✓" : "✗";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail || "");
  } catch (error) {
    record(name, false, error.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchText(path) {
  const response = await fetch(BASE + path, { redirect: "follow" });
  return { status: response.status, text: await response.text(), response };
}

function attr(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1] : null;
}

/* ------------------------------------------------------------------ */
/* expected output                                                     */
/* ------------------------------------------------------------------ */

const PUBLISHED = ["rizzy", "kelapaku", "forsha-7"];
const GLOBAL_FORBIDDEN = [
  "GUSTAVO",
  "Coconut ERP",
  "AI City",
  "Venom",
  "DEEP WORK",
  "Plastic to Fuel",
  "DedSec"
];

const pages = [
  "/",
  "/projects/",
  ...PUBLISHED.map((slug) => `/projects/${slug}/`),
  "/404.html"
];

const documents = new Map();

/* ------------------------------------------------------------------ */
/* routes                                                              */
/* ------------------------------------------------------------------ */

for (const path of pages) {
  await check(`route ${path} returns 200`, async () => {
    const { status, text } = await fetchText(path);
    assert(status === 200, `expected 200, received ${status}`);
    documents.set(path, text);
    return `${text.length} bytes`;
  });
}

await check("withheld project route returns 404", async () => {
  const { status } = await fetchText("/projects/gustavo/");
  assert(status === 404, `expected 404, received ${status}`);
});

for (const path of ["/sitemap.xml", "/robots.txt"]) {
  await check(`${path} is served`, async () => {
    const { status, text } = await fetchText(path);
    assert(status === 200, `expected 200, received ${status}`);
    return `${text.length} bytes`;
  });
}

/* ------------------------------------------------------------------ */
/* metadata                                                            */
/* ------------------------------------------------------------------ */

for (const [path, html] of documents) {
  if (path === "/404.html") continue;

  await check(`metadata on ${path}`, async () => {
    const title = attr(html, /<title>([^<]*)<\/title>/);
    assert(title && title.length > 8, "missing <title>");
    assert(/<meta name="description" content="[^"]{20,}"/.test(html), "missing meta description");
    assert(/<link rel="canonical" href="https:\/\/dikapersonal\.my\.id/.test(html), "missing canonical");
    assert(/property="og:image"/.test(html), "missing og:image");
    assert(/name="twitter:card"/.test(html), "missing twitter card");
    assert(/<html lang="en">/.test(html), "html lang is not en");

    const h1Count = (html.match(/<h1[\s>]/g) || []).length;
    assert(h1Count === 1, `expected exactly one h1, found ${h1Count}`);
    return title.trim();
  });
}

/* ------------------------------------------------------------------ */
/* internal links                                                      */
/* ------------------------------------------------------------------ */

await check("internal links resolve", async () => {
  const targets = new Set();
  for (const [path, html] of documents) {
    if (path === "/404.html") continue;
    for (const match of html.matchAll(/href="(\/[^"]*)"/g)) {
      const href = match[1].split("#")[0];
      if (!href || href.startsWith("//")) continue;
      if (/\.(webp|png|jpg|svg|woff2|css|js)$/.test(href)) continue;
      targets.add(href);
    }
  }

  const failures = [];
  for (const target of targets) {
    const { status } = await fetchText(target);
    if (status >= 400) failures.push(`${target} → ${status}`);
  }

  assert(failures.length === 0, failures.join(", "));
  return `${targets.size} links`;
});

await check("no external font requests", async () => {
  for (const [path, html] of documents) {
    if (/fonts\.googleapis|fonts\.gstatic/.test(html)) {
      throw new Error(`external font reference on ${path}`);
    }
  }
  return "fonts self-hosted";
});

/* ------------------------------------------------------------------ */
/* adaptive 3D hero                                                    */
/* ------------------------------------------------------------------ */

await check("no third-party script or style requests", async () => {
  const loaderRel = /rel="(stylesheet|preload|modulepreload|preconnect|dns-prefetch|prefetch)"/i;
  for (const [path, html] of documents) {
    if (/<script[^>]+src="https?:\/\//.test(html)) throw new Error(`external script on ${path}`);
    for (const tag of html.matchAll(/<link\b[^>]*>/g)) {
      if (!loaderRel.test(tag[0])) continue;
      if (/href="https?:\/\//.test(tag[0])) throw new Error(`external resource on ${path}`);
    }
  }
  return "everything self-hosted";
});

await check("hero declares a render mode", async () => {
  const html = documents.get("/") || "";
  const match = html.match(/class="hero-art"[^>]*data-render="([a-z]+)"/);
  assert(match, "hero-art has no data-render attribute");
  assert(["poster", "lite", "full", "still"].includes(match[1]), `unknown render mode "${match[1]}"`);
  return match[1];
});

await check("3D hero assets are served within budget", async () => {
  const glb = await fetch(`${BASE}/assets/3d/lex-01.glb`);
  assert(glb.status === 200, `GLB status ${glb.status}`);
  const glbSize = (await glb.arrayBuffer()).byteLength;
  assert(glbSize < 1.2 * 1024 * 1024, `GLB is ${(glbSize / 1048576).toFixed(2)} MB, over budget`);

  const viewer = await fetch(`${BASE}/assets/vendor/model-viewer.min.js`);
  assert(viewer.status === 200, `model-viewer status ${viewer.status}`);
  const viewerSize = (await viewer.arrayBuffer()).byteLength;
  assert(viewerSize < 1.2 * 1024 * 1024, `model-viewer is ${(viewerSize / 1048576).toFixed(2)} MB, over budget`);

  const poster = await fetch(`${BASE}/assets/lex-01-poster.webp`);
  assert(poster.status === 200, `poster status ${poster.status}`);
  const posterSize = (await poster.arrayBuffer()).byteLength;
  assert(posterSize < 120 * 1024, `poster is ${(posterSize / 1024).toFixed(0)} KB, over budget`);

  return `glb ${(glbSize / 1024).toFixed(0)} KB · viewer ${(viewerSize / 1024).toFixed(0)} KB · poster ${(posterSize / 1024).toFixed(0)} KB`;
});

/* ------------------------------------------------------------------ */
/* public-safe content                                                 */
/* ------------------------------------------------------------------ */

await check("no withheld project names in output", async () => {
  for (const [path, html] of documents) {
    for (const term of GLOBAL_FORBIDDEN) {
      if (html.includes(term)) throw new Error(`"${term}" found on ${path}`);
    }
  }
  return `${GLOBAL_FORBIDDEN.length} terms absent`;
});

await check("no credential-shaped strings in output", async () => {
  const patterns = [/ghp_[A-Za-z0-9]{20,}/, /sk-[A-Za-z0-9]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];
  for (const [path, html] of documents) {
    for (const pattern of patterns) {
      if (pattern.test(html)) throw new Error(`secret-shaped string on ${path}`);
    }
  }
  return "clean";
});

await check("images have alt text", async () => {
  for (const [path, html] of documents) {
    for (const match of html.matchAll(/<img\b[^>]*>/g)) {
      if (!/\balt="/.test(match[0])) throw new Error(`image without alt on ${path}`);
    }
  }
  return "ok";
});

await check("sitemap only lists published pages", async () => {
  const { text } = await fetchText("/sitemap.xml");
  for (const term of GLOBAL_FORBIDDEN) {
    if (text.includes(term.toLowerCase())) throw new Error(`withheld content in sitemap: ${term}`);
  }
  for (const slug of PUBLISHED) {
    assert(text.includes(`/projects/${slug}/`), `missing ${slug} in sitemap`);
  }
  const count = (text.match(/<url>/g) || []).length;
  assert(count === PUBLISHED.length + 2, `expected ${PUBLISHED.length + 2} urls, found ${count}`);
  return `${count} urls`;
});

await check("robots.txt points at the sitemap", async () => {
  const { text } = await fetchText("/robots.txt");
  assert(/Sitemap: https:\/\/dikapersonal\.my\.id\/sitemap\.xml/.test(text), "missing sitemap line");
  return "ok";
});

/* ------------------------------------------------------------------ */
/* browser checks                                                      */
/* ------------------------------------------------------------------ */

async function loadPlaywright() {
  const candidates = [];

  if (process.env.PLAYWRIGHT_CORE) candidates.push(process.env.PLAYWRIGHT_CORE);

  try {
    const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
    candidates.push(join(globalRoot, "@playwright", "cli", "node_modules", "playwright-core"));
  } catch {
    /* npm not available — fall through */
  }

  for (const candidate of candidates) {
    try {
      const entry = candidate.endsWith(".js") ? candidate : join(candidate, "index.js");
      const loaded = await import(pathToFileURL(entry).href);
      if (loaded.chromium) return loaded;
      if (loaded.default && loaded.default.chromium) return loaded.default;
    } catch {
      /* try the next candidate */
    }
  }

  return null;
}

const playwright = await loadPlaywright();

if (!playwright) {
  record("browser checks", false, "playwright-core not resolvable — skipped (not a pass)");
} else {
  const browser = await playwright.chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });

  const viewports = [
    { width: 360, height: 800 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 }
  ];

  /* responsive: no horizontal overflow, no console errors */
  for (const viewport of viewports) {
    await check(`no overflow at ${viewport.width}px`, async () => {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];

      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      await page.goto(BASE + "/", { waitUntil: "load" });
      await page.waitForTimeout(250);

      const metrics = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth
      }));

      await context.close();
      assert(metrics.scroll <= metrics.client + 1, `horizontal overflow ${metrics.scroll} > ${metrics.client}`);
      assert(errors.length === 0, `console errors: ${errors.join(" | ")}`);
      return `${metrics.scroll}px wide`;
    });
  }

  /* no-JS rendering */
  await check("content is readable without JavaScript", async () => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE + "/", { waitUntil: "load" });

    const visible = await page.evaluate(() => {
      const heading = document.querySelector("h1");
      const opacity = heading ? getComputedStyle(heading).opacity : "0";
      const poster = document.querySelector(".hero-poster");
      const model = document.querySelector("model-viewer");
      return {
        text: heading ? heading.textContent.trim().slice(0, 20) : "",
        opacity,
        poster: poster ? getComputedStyle(poster).display : null,
        model: model ? getComputedStyle(model).display : null
      };
    });

    await context.close();
    assert(visible.text.length > 0, "h1 missing without JS");
    assert(Number(visible.opacity) === 1, `h1 opacity is ${visible.opacity}`);
    assert(visible.poster !== "none", "hero poster is hidden without JavaScript");
    assert(visible.model === "none", "model-viewer is shown without JavaScript");
    return visible.text;
  });

  /* reduced motion */
  await check("reduced motion keeps content visible", async () => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE + "/", { waitUntil: "load" });

    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll(".reveal")].filter((el) => Number(getComputedStyle(el).opacity) < 1).length
    );

    await context.close();
    assert(hidden === 0, `${hidden} reveal elements still hidden`);
    return "all visible";
  });

  /* the adaptive 3D hero must never animate under reduced motion */
  await check("reduced motion keeps the 3D hero on its poster", async () => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForTimeout(500);

    const state = await page.evaluate(() => {
      const art = document.querySelector(".hero-art");
      const poster = document.querySelector(".hero-poster");
      return {
        mode: art ? art.getAttribute("data-render") : null,
        label: document.querySelector("[data-probe-text]")?.textContent?.trim() || "",
        poster: poster ? getComputedStyle(poster).display : null
      };
    });

    await context.close();
    assert(state.mode === "poster", `expected poster mode, got ${state.mode}`);
    assert(state.poster !== "none", "poster is hidden under reduced motion");
    assert(!/PROBE/.test(state.label), `scanner still probing: "${state.label}"`);
    return state.label || "poster";
  });

  /* keyboard access */
  await check("keyboard reaches navigation and terminal", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE + "/", { waitUntil: "load" });

    await page.keyboard.press("Tab");
    const firstFocus = await page.evaluate(() => document.activeElement?.className || "");
    assert(/skip/.test(firstFocus), `first tab stop is "${firstFocus}"`);

    await page.keyboard.press("Tab");
    const secondFocus = await page.evaluate(() => document.activeElement?.textContent?.trim() || "");
    assert(secondFocus.length > 0, "second tab stop has no label");

    await page.focus("#term-input");
    await page.keyboard.type("help");
    await page.keyboard.press("Enter");
    const output = await page.textContent("[data-term-log]");
    assert(output.includes("Available commands"), "terminal did not answer help");

    await context.close();
    return `first stop: ${firstFocus}`;
  });

  /* terminal safety and navigation */
  await check("terminal rejects unknown commands", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE + "/", { waitUntil: "load" });

    await page.fill("#term-input", "rm -rf /");
    await page.press("#term-input", "Enter");
    const output = await page.textContent("[data-term-log]");

    await page.fill("#term-input", "open gustavo");
    await page.press("#term-input", "Enter");
    const withheld = await page.textContent("[data-term-log]");

    await context.close();
    assert(output.includes("command not found"), "unknown command was not rejected");
    assert(withheld.includes("not published"), "withheld project was not blocked");
    return "safe";
  });

  await check("terminal opens a published project", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE + "/", { waitUntil: "load" });

    await page.fill("#term-input", "open rizzy");
    await page.press("#term-input", "Enter");
    await page.waitForURL("**/projects/rizzy/", { timeout: 5000 });

    await context.close();
    return page.url();
  });

  /* 404 page */
  await check("404 page renders with a way back", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const response = await page.goto(BASE + "/404.html", { waitUntil: "load" });
    const status = response ? response.status() : 0;
    const link = await page.getAttribute('a[href="/"]', "href");
    const robots = await page.getAttribute('meta[name="robots"]', "content");
    await context.close();
    assert(link === "/", "no home link on 404 page");
    assert(robots === "noindex", "404 page should be noindex");
    return `status ${status}`;
  });

  await browser.close();
}

/* ------------------------------------------------------------------ */
/* summary                                                             */
/* ------------------------------------------------------------------ */

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

if (failed.length) {
  console.error("\nFailures:");
  for (const failure of failed) console.error(`  ✗ ${failure.name} — ${failure.detail}`);
  process.exit(1);
}
