import { mix } from './color.ts'
import type { FaceId } from './fonts.ts'
import { n, type Random } from './util.ts'

/** Everything a theme's artwork may draw with. Coordinates are canvas units. */
export interface Sheet {
  /** The printed inlay: the paper visible through the case. */
  x: number
  y: number
  w: number
  h: number
  /** The stretch between the title and the catalog line that artwork can occupy. */
  free: { x0: number; x1: number }
  paper: string
  ink: string
  accent: string
  /** Seeded by the title, so a spine wears identically on every request. */
  rand: Random
  /** Prefix for ids, unique within the document. */
  id: string
}

export interface Theme {
  label: string
  paper: string
  ink: string
  accent: string
  title: {
    face: FaceId
    /** Cap height as a fraction of the inlay height. */
    cap: number
    tracking?: number
    upper?: boolean
    /** Slant in degrees, for faces that have no italic. */
    skew?: number
  }
  /** Paper grain strength, 0–1. */
  grain: number
  /** Artwork printed under the type; returns SVG markup clipped to the inlay. */
  art?(sheet: Sheet): string
  /** A plate drawn behind the title, hugging its bounds. */
  plate?(sheet: Sheet, box: { x: number; y: number; w: number; h: number }): string
}

export const themes = {
  paper: {
    label: 'Paper',
    paper: '#ece6d7',
    ink: '#17171a',
    accent: '#9fd3bf',
    title: { face: 'sans', cap: 0.3 },
    grain: 0.5,
    // A single offset-printed disc rising from the foot of the spine.
    art: ({ x, y, w, h, accent }) =>
      `<circle cx="${n(x + w + h * 0.3)}" cy="${n(y + h / 2)}" r="${n(h * 1.4)}" fill="${accent}"/>`,
  },

  clay: {
    label: 'Clay',
    paper: '#b4502e',
    ink: '#f3e3c7',
    accent: '#e8b08c',
    title: { face: 'serif', cap: 0.46, tracking: -0.01 },
    grain: 0.8,
    // Shelf wear: scuffed edges and a few creases where the card has been folded.
    art: ({ x, y, w, h, accent, rand }) => {
      const scuff = (edge: number) => {
        let d = `M${n(x)} ${n(edge)}`
        for (let px = x; px <= x + w; px += 14 + rand() * 30) {
          d += `L${n(px)} ${n(edge + (rand() - 0.5) * 5)}`
        }
        return `<path d="${d}" stroke="${accent}" stroke-width="${n(1.5 + rand() * 2)}" opacity=".45" fill="none"/>`
      }
      let creases = ''
      for (let i = 0; i < 4; i++) {
        const cx = x + rand() * w
        const lean = (rand() - 0.5) * 60
        creases += `<path d="M${n(cx)} ${n(y)}l${n(lean)} ${n(h)}" stroke="${accent}" stroke-width=".8" opacity="${n(0.15 + rand() * 0.2)}"/>`
      }
      return scuff(y + 2) + scuff(y + h - 2) + creases
    },
  },

  steel: {
    label: 'Steel',
    paper: '#b9bbbe',
    ink: '#1b1b1e',
    accent: '#2a2a2e',
    title: { face: 'mono', cap: 0.3, tracking: 0.22 },
    grain: 0.25,
    // Brushed aluminium, then a run of poured-concrete shuttering.
    art: ({ x, y, w, h, free, paper, accent, rand, id }) => {
      let out =
        `<linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="${mix(paper, '#ffffff', 0.5)}"/>` +
        `<stop offset=".45" stop-color="${paper}"/>` +
        `<stop offset="1" stop-color="${mix(paper, '#000000', 0.3)}"/></linearGradient>` +
        `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="url(#${id}m)"/>`
      for (let i = 0; i < 26; i++) {
        const sy = y + rand() * h
        const sx = x + rand() * w * 0.8
        out += `<path d="M${n(sx)} ${n(sy)}h${n(60 + rand() * 260)}" stroke="${rand() > 0.5 ? '#fff' : '#000'}" stroke-width=".6" opacity="${n(0.08 + rand() * 0.14)}"/>`
      }
      // Three courses, each starting a step further along.
      const span = free.x1 - free.x0
      if (span > 160) {
        const course = h / 3
        for (let i = 0; i < 3; i++) {
          const bx = free.x0 + span * (0.3 + i * 0.14)
          out += `<rect x="${n(bx)}" y="${n(y + course * i)}" width="${n(x + w - bx)}" height="${n(course)}" fill="${accent}" opacity="${n(0.16 + i * 0.16)}"/>`
        }
      }
      return out
    },
  },

  noir: {
    label: 'Noir',
    paper: '#0e0e10',
    ink: '#efece3',
    accent: '#e5322b',
    title: { face: 'poster', cap: 0.6, upper: true, skew: -10, tracking: 0.01 },
    grain: 0.3,
    // Scratched black card with one red stroke of the knife.
    art: ({ x, y, w, h, free, ink, accent, rand }) => {
      let out = ''
      for (let i = 0; i < 18; i++) {
        const sx = x + rand() * w
        const sy = y + rand() * h
        out += `<path d="M${n(sx)} ${n(sy)}l${n((rand() - 0.5) * 50)} ${n((rand() - 0.5) * 12)}" stroke="${ink}" stroke-width=".7" opacity="${n(0.08 + rand() * 0.2)}"/>`
      }
      if (free.x1 - free.x0 > 110) {
        const sx = free.x1 - 30
        out += `<path d="M${n(sx)} ${n(y + h * 0.18)}L${n(sx - 78)} ${n(y + h * 0.82)}l-6 -1z" fill="${accent}"/>`
      }
      return out
    },
  },

  grid: {
    label: 'Grid',
    paper: '#f4efe0',
    ink: '#202024',
    accent: '#1f5fd0',
    title: { face: 'mono', cap: 0.3, tracking: 0.02 },
    grain: 0.35,
    // Engineering graph paper with a two-pass ribbon plotted across it.
    art: ({ x, y, w, h, free, accent, id }) => {
      const cell = h / 8
      let out =
        `<pattern id="${id}g" x="${n(x)}" y="${n(y)}" width="${n(cell)}" height="${n(cell)}" patternUnits="userSpaceOnUse">` +
        `<path d="M${n(cell)} 0H0V${n(cell)}" fill="none" stroke="${accent}" stroke-width=".7" opacity=".35"/></pattern>` +
        `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="url(#${id}g)"/>`
      const span = free.x1 - free.x0
      if (span > 160) {
        const x0 = free.x0 + 30
        const period = Math.min(240, (span - 60) / 2)
        const waves = Math.max(1, Math.floor((span - 60) / period))
        const ribbon = (flip: number) => {
          let d = `M${n(x0)} ${n(y + h / 2 - flip * h * 0.42)}`
          for (let i = 0; i < waves; i++) {
            const dir = (i % 2 ? -1 : 1) * flip
            d += `c${n(period * 0.45)} 0 ${n(period * 0.55)} ${n(dir * h * 0.84)} ${n(period)} ${n(dir * h * 0.84)}`
          }
          return d
        }
        out +=
          `<path d="${ribbon(1)}" fill="none" stroke="${mix(accent, '#0a1a3a', 0.55)}" stroke-width="${n(h * 0.17)}"/>` +
          `<path d="${ribbon(-1)}" fill="none" stroke="${accent}" stroke-width="${n(h * 0.17)}"/>`
      }
      return out
    },
    // The title sits on a typed label, taped to the sheet.
    plate: ({ paper, ink }, box) =>
      `<rect x="${n(box.x - 16)}" y="${n(box.y - 12)}" width="${n(box.w + 32)}" height="${n(box.h + 24)}" rx="5" ` +
      `fill="${mix(paper, '#ffffff', 0.35)}" stroke="${ink}" stroke-opacity=".18"/>`,
  },

  signal: {
    label: 'Signal',
    paper: '#f6c417',
    ink: '#111112',
    accent: '#111112',
    title: { face: 'heavy', cap: 0.4, tracking: -0.02 },
    grain: 0.45,
    // A waveform burned across the middle of the sheet.
    art: ({ y, h, free, accent, rand }) => {
      const span = free.x1 - free.x0 - 60
      if (span < 100) return ''
      let d = ''
      const step = 5
      const count = Math.floor(span / step)
      const bursts = [0.18 + rand() * 0.1, 0.5 + (rand() - 0.5) * 0.1, 0.8 + (rand() - 0.5) * 0.1]
      for (let i = 0; i < count; i++) {
        const t = i / count
        const envelope = bursts.reduce((m, b) => Math.max(m, Math.exp(-(((t - b) / 0.07) ** 2))), 0)
        const amp = h * (0.02 + envelope * (0.2 + rand() * 0.26))
        d += `M${n(free.x0 + 30 + i * step)} ${n(y + h / 2 - amp)}v${n(amp * 2)}`
      }
      return `<path d="${d}" stroke="${accent}" stroke-width="2.4" fill="none"/>`
    },
  },

  midnight: {
    label: 'Midnight',
    paper: '#0b1a36',
    ink: '#cfe0ff',
    accent: '#3d8bff',
    title: { face: 'sans', cap: 0.27, tracking: 0.3, upper: true },
    grain: 0.3,
    // Rings spreading from a light somewhere below the surface.
    art: ({ x, y, w, h, free, paper, accent, id }) => {
      const cx = free.x1 - free.x0 > 200 ? free.x0 + (free.x1 - free.x0) * 0.55 : x + w * 0.7
      const cy = y + h * 0.5
      let out =
        `<radialGradient id="${id}r" cx="${n(cx)}" cy="${n(cy)}" r="${n(w * 0.38)}" gradientUnits="userSpaceOnUse">` +
        `<stop offset="0" stop-color="${mix(accent, '#ffffff', 0.25)}" stop-opacity=".9"/>` +
        `<stop offset=".25" stop-color="${accent}" stop-opacity=".45"/>` +
        `<stop offset="1" stop-color="${paper}" stop-opacity="0"/></radialGradient>` +
        `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="url(#${id}r)"/>`
      for (let i = 1; i <= 9; i++) {
        out += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(i * h * 0.42)}" fill="none" stroke="${mix(accent, '#ffffff', 0.5)}" stroke-width="1" opacity="${n(0.34 - i * 0.03)}"/>`
      }
      return out
    },
  },

  candy: {
    label: 'Candy',
    paper: '#f7a6a6',
    ink: '#1f1f40',
    accent: '#fde48c',
    title: { face: 'round', cap: 0.44 },
    grain: 0.55,
    // Torn strips of a second sheet, pasted on the diagonal.
    art: ({ x, y, w, h, free, paper, accent, rand }) => {
      let out = ''
      // Strips start after the title so they never tear through it.
      const start = free.x0
      const torn = (x0: number, width: number) => {
        const lean = h * 0.9
        const edge = (ox: number, from: number, to: number) => {
          let d = ''
          const steps = 7
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            d += `L${n(ox + lean * (from + (to - from) * t) + (rand() - 0.5) * 7)} ${n(y + h * (from + (to - from) * t))}`
          }
          return d
        }
        return `M${n(x0)} ${n(y)}${edge(x0, 0, 1)}${edge(x0 + width, 1, 0)}z`
      }
      for (let px = start - 90; px < x + w; ) {
        const gap = 90 + rand() * 150
        const width = 80 + rand() * 160
        px += gap
        const d = torn(px, width)
        out +=
          `<path d="${d}" fill="${mix(paper, '#ffffff', 0.7)}" transform="translate(-3 0)"/>` +
          `<path d="${d}" fill="${accent}"/>`
        px += width
      }
      return out
    },
  },
} satisfies Record<string, Theme>

export type ThemeId = keyof typeof themes

export const themeIds = Object.keys(themes) as ThemeId[]

export function isTheme(value: string | undefined): value is ThemeId {
  return value !== undefined && Object.hasOwn(themes, value)
}
