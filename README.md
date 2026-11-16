<div align="center">

# Spines

**README badges shaped like CD jewel case spines.**<br>
**把技术栈、AI 工具和项目做成 CD 盒侧脊的 README 徽章。**

English · [中文文档](README.zh-CN.md)

<img src="docs/images/shelf.jpg" alt="A shelf of CD jewel case spines for AI apps" width="100%" />

</div>

One image URL puts a spine, or a whole shelf, in a README or GitHub profile.
This repository holds everything behind it:

| | |
| --- | --- |
| [`apps/web`](apps/web) | The badge site: a Cloudflare Worker that draws SVG on request, and its home page. |
| [`packages/spine`](packages/spine) | The renderer. Pure TypeScript, no dependencies, text set as outlines. |
| [`art`](art) | Prints: one finished spine image per tool or project. [Contributions welcome](art/README.md). |
| [`skills/cd-spine-art`](skills/cd-spine-art) | The agent skill that draws prints with an image model. |

> The site is not deployed under a public address yet. The examples below use
> `https://YOUR-DOMAIN`; see [Deploy](#deploy).

## Use a badge

```md
![TypeScript](https://YOUR-DOMAIN/badge/typescript.svg)
![My stack](https://YOUR-DOMAIN/badge/typescript,react,docker,claude.svg)
```

One name lies down like a badge. Several stand side by side on a shelf.
Add `?layout=stack` to lay several down, or `?layout=row` to stand one up.

| URL | Draws |
| --- | --- |
| `/badge/<name>,<name>.svg` | Catalog entries for common AI tools and tech stacks ([the list](apps/web/src/presets.ts)). Short names work: `ts`, `py`, `k8s`, `next`. |
| `/spine/<title>.svg` | Any title, typeset. |
| `/gh/<owner>/<repo>.svg` | A repository, with its stars and the mark of its main language. |
| `/gh/<owner>.svg` | An account's most-starred repositories on a shelf. `count` 1–12, default 8. |
| `/art/<name>,<name>.svg` | Prints from [`art`](art). |
| `/shelf.svg?s=<item>&s=<item>` | Up to 24 of any kind. An item is a title, `badge:name`, `gh:owner/repo` or `art:name`, each with optional `;key=value` settings. |

| Option | Values | |
| --- | --- | --- |
| `theme` | `paper` `clay` `steel` `noir` `grid` `signal` `midnight` `candy` | Picked from the title when omitted. |
| `sub` | text | The catalog line at the foot of the spine. |
| `icon` | a [Simple Icons](https://simpleicons.org) slug, or `none` | The mark at the head. |
| `paper` `ink` `accent` | hex without `#` | Recolor a theme. Ink adapts to the paper unless given. |
| `width` | `slim` `regular` `wide` | Thickness of the case. |
| `layout` | `stack` `row` | Lying down, or standing. |
| `size` | 120–2400 | Length of a spine in pixels. |
| `gap` | 0–24 | Space between spines in pixels. |

A catalog badge shows its print from `art/` once someone has drawn it, and is
typeset until then. Passing any styling option asks for the typeset version.
A request that fails still answers with a spine that says why.

## Contribute a print

Each catalog entry wants one image of its own, and any project can have one.
[`art/WANTED.md`](art/WANTED.md) lists what is missing and
[`art/README.md`](art/README.md) explains how to add it.

## Develop

Needs Node 22 and pnpm.

```bash
pnpm install
```

```bash
pnpm dev
```

| Command | |
| --- | --- |
| `pnpm test` | Renderer and Worker tests. |
| `pnpm typecheck` | TypeScript, both packages. |
| `pnpm lint` | Biome. `pnpm format` fixes. |
| `pnpm art` | Rebuild the web copies of `art/` and `art/WANTED.md`. |
| `pnpm fonts` | Rebuild the glyph atlases the renderer sets text from. |

## Deploy

```bash
pnpm run deploy
```

This runs `wrangler deploy` for [`apps/web`](apps/web/wrangler.jsonc). Log in
first with `pnpm --filter @repo/web exec wrangler login`, or connect the
repository to Workers Builds with `apps/web` as the root directory.
[`deploy.yml`](.github/workflows/deploy.yml) deploys on every push to `main`
once `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set as secrets.

GitHub routes read the GitHub API without a token, which allows 60 requests an
hour. To raise that to 5,000, store a token with no scopes:

```bash
pnpm --filter @repo/web exec wrangler secret put GITHUB_TOKEN
```

## The skill

`cd-spine-art` guides an agent from verified brand marks through art direction
to a cropped, upright spine. It needs an image tool that accepts reference
images, plus Python 3 and Pillow for cropping.

```bash
npx skills add stvlynn/cd-spine-art-skill
```

Then ask for what you want:

> Use `$cd-spine-art` to make a CD spine for React and add it to `art/stack/`.

## Credits

Brand marks come from [Simple Icons](https://simpleicons.org) and belong to
their owners. The home page follows the
[Sunbeam](https://github.com/AstraFoundry/design) design system (MIT). Spine
type is set in Inter, Fraunces, JetBrains Mono, Anton and Fredoka (OFL).
