import { type FaceId, faces, systemStack } from './fonts.ts'
import { esc, n } from './util.ts'

/** A line of type that has been measured and can be placed. */
export interface Line {
  width: number
  /** Cap height the line was actually set at. */
  cap: number
  /** Draws the line with its left edge at `x`, sitting on `baseline`. */
  draw(x: number, baseline: number, fill: string, skew?: number): string
}

export interface Type {
  face: FaceId
  /** Cap height in canvas units; sizing by cap height keeps faces optically matched. */
  cap: number
  /** Letterspacing in em. */
  tracking?: number
}

/**
 * Sets a line of text. Text we have outlines for becomes a single <path>, so it
 * renders identically wherever the SVG lands; anything else (CJK, emoji) falls
 * back to a system-font <text> with an estimated width.
 */
export function set(text: string, { face: id, cap, tracking = 0 }: Type): Line {
  const face = faces[id]
  const size = (cap / face.capHeight) * 1000
  const scale = size / 1000
  const chars = [...text]

  if (chars.every((c) => face.glyphs[c])) {
    let pen = 0
    let d = ''
    chars.forEach((char, i) => {
      const [advance, outline] = face.glyphs[char]!
      const dx = Math.round(pen)
      d += outline.replace(/(-?\d+) (-?\d+)/g, (_, x, y) => `${Number(x) + dx} ${y}`)
      pen += advance + tracking * 1000 + (face.kern[char + (chars[i + 1] ?? '')] ?? 0)
    })
    return {
      cap,
      width: Math.max(0, pen - tracking * 1000) * scale,
      draw: (x, baseline, fill, skew = 0) =>
        `<path fill="${fill}" transform="translate(${n(x)} ${n(baseline)})${
          skew ? ` skewX(${skew})` : ''
        } scale(${scale.toFixed(4)})" d="${d}"/>`,
    }
  }

  const ems = chars.reduce((sum, c) => sum + (isWide(c) ? 1 : 0.6) + tracking, -tracking)
  return {
    cap,
    width: Math.max(0, ems) * size,
    draw: (x, baseline, fill, skew = 0) =>
      `<text x="${n(x)}" y="${n(baseline)}" fill="${fill}" font-family="${systemStack[id]}" ` +
      `font-size="${n(size)}" font-weight="${face.weight}"${
        tracking ? ` letter-spacing="${n(tracking * size)}"` : ''
      }${skew ? ` transform="skewX(${skew})" transform-origin="${n(x)} ${n(baseline)}"` : ''}>${esc(text)}</text>`,
  }
}

/**
 * Fits a line into `room` the way a designer would on a real spine: first set
 * it smaller, and only when it would become unreadable, cut it short.
 */
export function fit(text: string, type: Type, room: number, minScale = 0.55): Line {
  let line = set(text, type)
  if (line.width <= room) return line

  const scale = Math.max(minScale, room / line.width)
  const smaller = { ...type, cap: type.cap * scale }
  line = set(text, smaller)

  const chars = [...text]
  while (line.width > room && chars.length > 1) {
    chars.pop()
    line = set(`${chars.join('').trimEnd()}…`, smaller)
  }
  return line
}

function isWide(char: string): boolean {
  const c = char.codePointAt(0)!
  return (
    (c >= 0x1100 && c <= 0x115f) ||
    (c >= 0x2e80 && c <= 0xa4cf) ||
    (c >= 0xac00 && c <= 0xd7a3) ||
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0xfe30 && c <= 0xfe4f) ||
    (c >= 0xff00 && c <= 0xff60) ||
    (c >= 0xffe0 && c <= 0xffe6) ||
    c >= 0x1f000
  )
}
