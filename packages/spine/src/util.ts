/** Escapes text for use in SVG content and double-quoted attributes. */
export function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

/** Formats a coordinate with at most two decimals and no trailing zeros. */
export function n(value: number): string {
  return String(Math.round(value * 100) / 100)
}

/** FNV-1a, for turning a title into a stable seed. */
export function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export type Random = () => number

/** mulberry32: a small seeded generator so every title wears the same way on every request. */
export function random(seed: number): Random {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
