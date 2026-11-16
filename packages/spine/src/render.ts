import { defs, draw, type Item, LENGTH } from './spine.ts'
import { esc, n } from './util.ts'

export interface Options {
  /**
   * `stack` lays spines down, one on top of the next — a single item makes the
   * classic horizontal badge. `row` stands them upright side by side, a shelf.
   */
  layout?: 'stack' | 'row'
  /** Length of a spine in CSS pixels. */
  length?: number
  /** Space between spines, in CSS pixels. */
  gap?: number
}

export const limits = { minLength: 120, maxLength: 2400, maxGap: 24 } as const

/** Renders spines to a self-contained SVG document. */
export function render(items: Item[], options: Options = {}): string {
  const layout = options.layout ?? 'stack'
  const length = clamp(options.length ?? 420, limits.minLength, limits.maxLength)
  const scale = length / LENGTH
  const gap = clamp(options.gap ?? 0, 0, limits.maxGap) / scale

  let offset = 0
  let body = ''
  const titles: string[] = []
  items.forEach((item, i) => {
    const drawn = draw(item, `s${i}`)
    const place =
      layout === 'row'
        ? `translate(${n(offset + drawn.thickness)} 0) rotate(90)`
        : `translate(0 ${n(offset)})`
    body += `<g transform="${place}"><title>${esc(drawn.title)}</title>${drawn.svg}</g>`
    titles.push(drawn.title)
    offset += drawn.thickness + gap
  })
  const across = Math.max(0, offset - gap)

  const [w, h] = layout === 'row' ? [across, LENGTH] : [LENGTH, across]
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(w * scale)}" height="${n(h * scale)}" ` +
    `viewBox="0 0 ${n(w)} ${n(h)}" role="img" aria-label="${esc(titles.join(', '))}">` +
    `<defs>${defs}</defs>${body}</svg>`
  )
}

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min
}
