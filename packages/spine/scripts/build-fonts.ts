/**
 * Compiles the typefaces used on spines into glyph atlases: outlines, advances
 * and kerning in a 1000-unit em with y pointing down. The renderer turns text
 * into <path> data from these, so a badge looks identical everywhere and the
 * runtime needs neither font files nor a font parser.
 *
 *   pnpm fonts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import opentype from 'opentype.js'

const require = createRequire(import.meta.url)

const FACES = {
  sans: ['inter', 500],
  heavy: ['inter', 800],
  serif: ['fraunces', 500],
  mono: ['jetbrains-mono', 500],
  poster: ['anton', 400],
  round: ['fredoka', 600],
} as const

const EM = 1000
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCodePoint(i + 32))
const LATIN1 = Array.from({ length: 95 }, (_, i) => String.fromCodePoint(i + 161))
const CHARSET = [...ASCII, ...LATIN1, ...'–—‘’“”…•·★']

for (const [id, [family, weight]] of Object.entries(FACES)) {
  const file = require.resolve(`@fontsource/${family}/files/${family}-latin-${weight}-normal.woff`)
  const data = readFileSync(file)
  const font = opentype.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
  const k = EM / font.unitsPerEm
  const unit = (n: number) => Math.round(n * k)

  const glyphs: Record<string, [advance: number, d: string]> = {}
  for (const char of CHARSET) {
    const glyph = font.charToGlyph(char)
    if (glyph.index === 0) continue
    let pen = ''
    const d = glyph.path.commands
      .map((c) => {
        switch (c.type) {
          case 'M':
          case 'L': {
            // TrueType contours often open with a zero-length line; drop it.
            const point = `${unit(c.x)} ${unit(-c.y)}`
            if (c.type === 'L' && point === pen) return ''
            pen = point
            return c.type + point
          }
          case 'Q':
            pen = `${unit(c.x)} ${unit(-c.y)}`
            return `Q${unit(c.x1)} ${unit(-c.y1)} ${unit(c.x)} ${unit(-c.y)}`
          case 'C':
            pen = `${unit(c.x)} ${unit(-c.y)}`
            return `C${unit(c.x1)} ${unit(-c.y1)} ${unit(c.x2)} ${unit(-c.y2)} ${unit(c.x)} ${unit(-c.y)}`
          default:
            return 'Z'
        }
      })
      .join('')
    glyphs[char] = [unit(glyph.advanceWidth ?? 0), d]
  }

  const kern: Record<string, number> = {}
  for (const a of ASCII) {
    for (const b of ASCII) {
      if (!glyphs[a] || !glyphs[b]) continue
      const value = unit(font.getKerningValue(font.charToGlyph(a), font.charToGlyph(b)))
      if (value) kern[a + b] = value
    }
  }

  const os2 = font.tables.os2
  const atlas = {
    family,
    weight,
    capHeight: unit(os2?.sCapHeight || font.charToGlyph('H').getMetrics().yMax),
    glyphs,
    kern,
  }
  const out = new URL(`../src/fonts/${id}.json`, import.meta.url)
  writeFileSync(out, `${JSON.stringify(atlas)}\n`)
  console.log(
    `${id.padEnd(7)} ${atlas.family} ${weight}: ${Object.keys(glyphs).length} glyphs, ` +
      `${Object.keys(kern).length} kerning pairs`,
  )
}
