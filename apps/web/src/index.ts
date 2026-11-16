import { type Item, render, type Spine, themeIds, themes, widths } from '@repo/spine'
import { type Env, HttpError, json, svg, ttl } from './http.ts'
import { options, type ShelfItem, type Style, shelfItem, spine, styleFrom } from './params.ts'
import { aliasesOf, type Preset, preset, presets } from './presets.ts'
import { gallery, hasPrint, print } from './sources/art.ts'
import { compact, languageIcon, type Repo, repo, topRepos } from './sources/github.ts'
import { icon } from './sources/icons.ts'

const MAX_SHELF = 24
/** Each repository costs up to two subrequests (GitHub, then its icon). */
const MAX_REPOS = 12

/** One spine lies down like a badge; several stand on a shelf. */
const LYING = { layout: 'stack', length: 420 } as const
const STANDING = { layout: 'row', length: 480 } as const
const byCount = (count: number) => (count > 1 ? STANDING : LYING)

interface Context {
  url: URL
  env: Env
}

type Handler = (ctx: Context, ...segments: string[]) => Promise<Response>

/** Routes, matched against the path with any `.svg` suffix removed. */
const routes: [RegExp, Handler][] = [
  [/^\/badge\/([^/]+)$/, badgeRoute],
  [/^\/spine\/([^/]+)$/, spineRoute],
  [/^\/art\/([^/]+)$/, artRoute],
  [/^\/shelf$/, shelfRoute],
  [/^\/gh\/([^/]+)\/([^/]+)$/, repoRoute],
  [/^\/gh\/([^/]+)$/, accountRoute],
  [/^\/api\/meta$/, metaRoute],
]

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx?: { waitUntil(promise: Promise<unknown>): void },
  ): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } })
    }

    const url = new URL(request.url)
    const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default
    // Key the cache by deploy, so new code never answers with old drawings.
    const key = new URL(url)
    key.searchParams.set('__v', env.VERSION?.id ?? 'dev')
    const hit = await cache?.match(key.toString())
    if (hit) return hit

    const response = await respond(url, env)
    if (cache && response.ok) ctx?.waitUntil(cache.put(key.toString(), response.clone()))
    return response
  },
}

async function respond(url: URL, env: Env): Promise<Response> {
  const path = url.pathname.replace(/\.svg$/, '')
  for (const [pattern, handler] of routes) {
    const match = path.match(pattern)
    if (!match) continue
    try {
      return await handler({ url, env }, ...match.slice(1).map(decode))
    } catch (error) {
      // A badge that fails should still be a badge, so the README shows what went wrong.
      const known = error instanceof HttpError
      if (!known) console.error(error)
      const status = known ? error.status : 500
      const message = known ? error.message : 'something broke'
      const body = render([{ title: message, sub: String(status), theme: 'noir' }], LYING)
      return svg(body, ttl.error, status)
    }
  }
  return new Response('Not found', { status: 404 })
}

/** `/badge/typescript,react` — ready-made spines for common tools, like shields.io. */
async function badgeRoute({ url, env }: Context, list: string) {
  const slugs = list.split(',').filter(Boolean)
  if (!slugs.length) throw new HttpError(400, 'name at least one badge')
  if (slugs.length > MAX_SHELF) throw new HttpError(400, `${MAX_SHELF} badges at most`)
  const style = styleFrom((key) => url.searchParams.get(key))
  const items = await Promise.all(slugs.map((slug) => badge(slug, style, env, url.origin)))
  return svg(render(items, options(url.searchParams, byCount(items.length))), ttl.static)
}

/** `/spine/:title` — one typeset spine. */
async function spineRoute({ url }: Context, title: string) {
  const style = styleFrom((key) => url.searchParams.get(key))
  const item = await withIcon(spine(title, style), style.icon)
  return svg(render([item], options(url.searchParams, LYING)), ttl.static)
}

/** `/art/claude,cursor` — prints from the gallery. */
async function artRoute({ url, env }: Context, list: string) {
  const slugs = list.toLowerCase().split(',').filter(Boolean)
  if (!slugs.length || slugs.length > MAX_SHELF)
    throw new HttpError(400, `name 1–${MAX_SHELF} prints`)
  const items = await Promise.all(slugs.map((slug) => print(slug, env, url.origin)))
  return svg(render(items, options(url.searchParams, byCount(items.length))), ttl.static)
}

/** `/shelf?s=…&s=…` — any mix of typeset spines, badges, repositories and prints. */
async function shelfRoute({ url, env }: Context) {
  const entries = url.searchParams.getAll('s').filter(Boolean)
  if (!entries.length) throw new HttpError(400, 'a shelf needs at least one s= item')
  if (entries.length > MAX_SHELF)
    throw new HttpError(400, `a shelf holds ${MAX_SHELF} spines at most`)

  const parsed = entries.map(shelfItem)
  if (parsed.filter((item) => item.kind === 'repo').length > MAX_REPOS) {
    throw new HttpError(400, `a shelf reads ${MAX_REPOS} repositories at most`)
  }
  const items = await Promise.all(parsed.map((item) => resolve(item, env, url.origin)))
  const live = parsed.some((item) => item.kind === 'repo')
  return svg(render(items, options(url.searchParams, STANDING)), live ? ttl.live : ttl.static)
}

/** `/gh/:owner/:repo` — a repository as a spine: its name, its stars, its language's mark. */
async function repoRoute({ url, env }: Context, owner: string, name: string) {
  const style = styleFrom((key) => url.searchParams.get(key))
  const item = await repoSpine(await repo(owner, name, env), style)
  return svg(render([item], options(url.searchParams, LYING)), ttl.live)
}

/** `/gh/:owner` — an account's most-starred repositories, shelved. */
async function accountRoute({ url, env }: Context, owner: string) {
  const count = Math.min(MAX_REPOS, Math.max(1, Number(url.searchParams.get('count')) || 8))
  const style = styleFrom((key) => url.searchParams.get(key))
  const repos = await topRepos(owner, count, env)
  if (!repos.length) throw new HttpError(404, `${owner} has no public repositories`)
  const items = await Promise.all(repos.map((r) => repoSpine(r, style)))
  return svg(render(items, options(url.searchParams, STANDING)), ttl.live)
}

/** `/api/meta` — what the home page offers, so it never drifts from the Worker. */
async function metaRoute() {
  return json(
    {
      themes: themeIds.map((id) => {
        const { label, paper, ink, accent } = themes[id]
        return { id, label, paper, ink, accent }
      }),
      widths: Object.keys(widths),
      badges: presets.map(({ slug, title, group }) => ({
        slug,
        title,
        group,
        aliases: aliasesOf(slug),
        print: hasPrint(slug),
      })),
      prints: gallery,
    },
    ttl.static,
  )
}

function resolve(item: ShelfItem, env: Env, origin: string): Promise<Item> {
  switch (item.kind) {
    case 'print':
      return print(item.slug, env, origin)
    case 'badge':
      return badge(item.slug, item.style, env, origin)
    case 'repo':
      return repo(item.owner, item.name, env).then((r) => repoSpine(r, item.style))
    case 'spine':
      return withIcon(spine(item.title, item.style), item.style.icon)
  }
}

/**
 * A catalog entry. Its own print is shown when one has been drawn; otherwise,
 * or when the caller asks for a particular look, it is typeset.
 */
function badge(slug: string, style: Style, env: Env, origin: string): Promise<Item> {
  const found = preset(slug)
  if (!found) throw new HttpError(404, `no badge called ${slug}`)
  if (hasPrint(found.slug) && !Object.keys(style).length) return print(found.slug, env, origin)
  return withIcon(
    spine(found.title, { ...presetStyle(found), ...style }),
    style.icon ?? found.icon.slug,
  )
}

function presetStyle({ theme, icon, paint }: Preset): Style {
  const brand = icon.hex
  if (paint === 'paper') return { theme, paper: brand }
  if (paint === 'accent') return { theme, accent: brand }
  return { theme }
}

function repoSpine(r: Repo, style: Style): Promise<Spine> {
  const sub = style.sub ?? (r.stars > 0 ? `★ ${compact(r.stars)}` : (r.language ?? r.owner))
  const mark = style.icon ?? (r.language ? languageIcon[r.language] : undefined)
  return withIcon(spine(r.name, { ...style, sub }), mark)
}

/** `icon=none` drops a default mark. */
async function withIcon(item: Spine, slug: string | undefined): Promise<Spine> {
  if (slug === 'none') return item
  const mark = await icon(slug?.toLowerCase())
  return mark ? { ...item, icon: mark } : item
}

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    throw new HttpError(400, 'malformed URL')
  }
}
