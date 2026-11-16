import { isTheme, type Options, type Spine, widths } from '@repo/spine'
import { HttpError } from './http.ts'

const MAX_TITLE = 80

/** The styling a caller may put on a spine, as query parameters or shelf-item fields. */
export interface Style {
  theme?: string
  sub?: string
  icon?: string
  paper?: string
  ink?: string
  accent?: string
  width?: string
}

const styleKeys = ['theme', 'sub', 'icon', 'paper', 'ink', 'accent', 'width'] as const

export function styleFrom(get: (key: string) => string | null | undefined): Style {
  const style: Style = {}
  for (const key of styleKeys) {
    const value = get(key)?.trim()
    if (value) style[key] = value
  }
  return style
}

/** Builds a spine from a title and loosely-typed style; unknown values fall back, never fail. */
export function spine(title: string, style: Style): Spine {
  const text = title.trim().replace(/\s+/g, ' ')
  if (!text) throw new HttpError(400, 'a spine needs a title')
  return {
    title: [...text].slice(0, MAX_TITLE).join(''),
    ...(style.sub ? { sub: [...style.sub].slice(0, 40).join('') } : {}),
    ...(isTheme(style.theme) ? { theme: style.theme } : {}),
    ...(style.paper ? { paper: style.paper } : {}),
    ...(style.ink ? { ink: style.ink } : {}),
    ...(style.accent ? { accent: style.accent } : {}),
    ...(style.width && Object.hasOwn(widths, style.width)
      ? { width: style.width as keyof typeof widths }
      : {}),
  }
}

export function options(
  query: URLSearchParams,
  fallback: Required<Pick<Options, 'layout' | 'length'>>,
): Options {
  const layout = query.get('layout')
  const number = (key: string) => {
    const value = Number(query.get(key))
    return query.has(key) && Number.isFinite(value) ? value : undefined
  }
  return {
    layout: layout === 'row' || layout === 'stack' ? layout : fallback.layout,
    length: number('size') ?? fallback.length,
    gap: number('gap') ?? 0,
  }
}

/**
 * One `s=` entry of a shelf. The first field names the spine, the rest style it:
 *
 *   Hello World;theme=noir;sub=v2     a typeset spine
 *   gh:honojs/hono;theme=clay         a repository, read from GitHub
 *   art:claude                        a print from the gallery
 *   badge:typescript;sub=5.9          a preset for a common tool or language
 */
export type ShelfItem =
  | { kind: 'spine'; title: string; style: Style }
  | { kind: 'repo'; owner: string; name: string; style: Style }
  | { kind: 'print'; slug: string }
  | { kind: 'badge'; slug: string; style: Style }

export function shelfItem(entry: string): ShelfItem {
  const [head = '', ...fields] = entry.split(';')
  const pairs = new Map(
    fields.map((field) => {
      const at = field.indexOf('=')
      return at < 0 ? [field, ''] : [field.slice(0, at), field.slice(at + 1)]
    }),
  )
  const style = styleFrom((key) => pairs.get(key))

  if (head.startsWith('art:')) return { kind: 'print', slug: head.slice(4).toLowerCase() }
  if (head.startsWith('badge:')) return { kind: 'badge', slug: head.slice(6), style }
  if (head.startsWith('gh:')) {
    const [owner, name, ...rest] = head.slice(3).split('/')
    if (!owner || !name || rest.length)
      throw new HttpError(400, `expected gh:owner/repo, got ${head}`)
    return { kind: 'repo', owner, name, style }
  }
  return { kind: 'spine', title: head, style }
}
