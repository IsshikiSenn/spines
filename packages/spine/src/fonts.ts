import heavy from './fonts/heavy.json' with { type: 'json' }
import mono from './fonts/mono.json' with { type: 'json' }
import poster from './fonts/poster.json' with { type: 'json' }
import round from './fonts/round.json' with { type: 'json' }
import sans from './fonts/sans.json' with { type: 'json' }
import serif from './fonts/serif.json' with { type: 'json' }

/**
 * A typeface compiled by `scripts/build-fonts.ts`: outlines in a 1000-unit em
 * with y pointing down, so a glyph drops into SVG with a translate and a scale.
 */
export interface Face {
  family: string
  weight: number
  capHeight: number
  glyphs: Record<string, [advance: number, d: string]>
  kern: Record<string, number>
}

export const faces = { sans, heavy, serif, mono, poster, round } as unknown as Record<FaceId, Face>

export type FaceId = 'sans' | 'heavy' | 'serif' | 'mono' | 'poster' | 'round'

/** What the viewer's system should reach for when a title has glyphs we don't carry (CJK, emoji). */
export const systemStack: Record<FaceId, string> = {
  sans: 'system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif',
  heavy: 'system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif',
  serif: 'Georgia,Songti SC,Noto Serif CJK SC,serif',
  mono: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
  poster: 'Impact,Haettenschweiler,Arial Narrow Bold,sans-serif',
  round: 'ui-rounded,system-ui,-apple-system,Segoe UI,sans-serif',
}
