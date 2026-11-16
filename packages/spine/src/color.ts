/** Normalizes `fff`, `#FFF` or `ffffff` to `#ffffff`; anything else is rejected. */
export function hex(input: string | undefined): string | undefined {
  const m = input?.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return undefined
  const digits = m[1]!.toLowerCase()
  return `#${digits.length === 3 ? digits.replace(/./g, '$&$&') : digits}`
}

function channels(color: string): [number, number, number] {
  const v = Number.parseInt(color.slice(1), 16)
  return [v >> 16, (v >> 8) & 255, v & 255]
}

/** WCAG relative luminance of a `#rrggbb` color. */
export function luminance(color: string): number {
  const [r, g, b] = channels(color).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Printing ink that stays legible on the given paper. */
export function inkFor(paper: string): string {
  return luminance(paper) > 0.3 ? '#17171a' : '#f3ede2'
}

/** Linear blend of two `#rrggbb` colors; `t = 0` is `a`. */
export function mix(a: string, b: string, t: number): string {
  const ca = channels(a)
  const cb = channels(b)
  const out = ca.map((c, i) => Math.round(c + (cb[i]! - c) * t))
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}
