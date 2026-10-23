# DIKA/OS

Personal portfolio of Dika — a systems builder working where software engineering
meets law and technology.

Live: **https://dikapersonal.my.id**

## What this is

A static site with a zero-dependency build step. Source lives in `src/`,
`content/` and `templates/`; `node build.mjs` writes plain HTML into the repository
root so GitHub Pages can serve it directly.

No framework, no bundler, no npm dependencies, no client-side router, no analytics.

```
content/projects.json     single source of truth for every project
templates/layout.html     document shell (head, header, footer)
src/index.html            homepage body
src/projects/index.html   project directory body
css/tokens.css            colour, type, spacing, motion tokens
css/style.css             layout and components
css/nav.css               mobile navigation
js/app.js                 progressive enhancement (nav, reveal)
js/terminal.js            terminal command interpreter
assets/                   fonts, images, favicon, OG card
tools/og.html             source for assets/og.jpg
tests/qa.mjs              route, metadata, link, safety and browser checks
build.mjs                 generator
```

## Build

```bash
node build.mjs          # write output
node build.mjs --check  # fail if committed output is stale
```

Build output (committed, served by Pages): `index.html`, `projects/`,
`sitemap.xml`, `robots.txt`, `404.html`.

Never edit generated HTML by hand — it is overwritten. Every generated file starts
with a marker comment. Edit `src/` or `content/projects.json` and rebuild.

## Preview

```bash
python3 -m http.server 8899
# http://127.0.0.1:8899
```

Use a server, not `file://` — the site uses root-absolute paths.

## Test

```bash
python3 -m http.server 8899 &
node tests/qa.mjs
```

The suite checks route status codes, page metadata, internal links, sitemap and
robots output, public-safe content, and — when `playwright-core` is resolvable —
responsive overflow at five widths, console errors, no-JS rendering, reduced
motion, keyboard access and terminal behaviour.

Set `QA_BASE` to test another origin. Set `PLAYWRIGHT_CORE` to point at a
`playwright-core` entry file if it is not installed globally.

## Deployment

GitHub Pages serves this repository from `main` at the repository root, with
`CNAME` pointing at `dikapersonal.my.id`.

```bash
git add -A
git commit -m "…"
git push origin main
```

Pages rebuilds in roughly one to two minutes. Verify the deployment rather than
assuming it:

```bash
curl -s https://dikapersonal.my.id/ | grep -o '<title>[^<]*</title>'
curl -o /dev/null -w '%{http_code}\n' https://dikapersonal.my.id/projects/
```

### Rollback

```bash
git revert HEAD && git push origin main
```

or, to discard a release entirely:

```bash
git reset --hard <known-good-tag> && git push --force-with-lease origin main
```

## Publishing a project

Only projects with public, verifiable evidence are published. A project is
rendered when `content/projects.json` has `"visibility": "published"` **and** the
build validation passes:

- `slug` — unique, kebab-case
- `status` — one of `research`, `development`, `testing`, `live`, `archived`
- at least one `technologies` entry
- at least one `evidence` link (a public URL someone can open)
- at least two `features` that are actually implemented

Entries with `"visibility": "pending-review"` are validated but never rendered,
never linked and never added to the sitemap. They are the holding area for work
that has not been verified yet.

Do not add metrics, customers, revenue, uptime or performance claims that cannot
be pointed at a public source.

## Content policy

Everything in this repository is public: the site, the source and
`content/projects.json`. Do not put internal review notes, credentials, private
endpoints or third-party personal data here.

## Credits

Typefaces: Manrope and DM Mono, self-hosted (SIL Open Font License).
