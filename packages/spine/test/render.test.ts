import { describe, expect, it } from 'vitest'
import { hex, render, type Spine, themeFor, themeIds } from '../src/index.ts'
import { fit, set } from '../src/text.ts'

const size = (svg: string) => {
  const [, w, h] = svg.match(/^<svg[^>]* width="([\d.]+)" height="([\d.]+)"/) ?? []
  return { width: Number(w), height: Number(h) }
}

describe('render', () => {
  it('lies a single spine down at the requested length', () => {
    const { width, height } = size(render([{ title: 'Hello' }], { length: 420 }))
    expect(width).toBe(420)
    expect(height).toBe(35)
  })

  it('stands spines side by side on a shelf', () => {
    const svg = render([{ title: 'A' }, { title: 'B', width: 'wide' }], {
      layout: 'row',
      length: 480,
    })
    const { width, height } = size(svg)
    expect(height).toBe(480)
    expect(width).toBe(88) // (100 + 120) × 0.4
  })

  it('stacks spines with gaps in CSS pixels', () => {
    const { height } = size(render([{ title: 'A' }, { title: 'B' }], { length: 600, gap: 10 }))
    expect(height).toBe(110)
  })

  it('clamps nonsense sizes instead of failing', () => {
    expect(size(render([{ title: 'A' }], { length: 1e9 })).width).toBe(2400)
    expect(size(render([{ title: 'A' }], { length: Number.NaN })).width).toBe(120)
  })

  it('is deterministic, so caches and snapshots hold', () => {
    const spine: Spine = { title: 'Same every time', sub: 'v1' }
    expect(render([spine])).toBe(render([spine]))
  })

  it('draws every theme', () => {
    for (const theme of themeIds) {
      const svg = render([{ title: 'Theme check', theme, sub: '★ 1k' }])
      expect(svg).toContain('aria-label="Theme check"')
      expect(svg).not.toContain('NaN')
      expect(svg).not.toContain('undefined')
    }
  })

  it('turns text it has glyphs for into outlines', () => {
    const svg = render([{ title: 'Outlined', theme: 'paper' }])
    expect(svg).not.toContain('<text')
  })

  it('falls back to escaped system text for glyphs it lacks', () => {
    const svg = render([{ title: '中文 <script>alert(1)</script>' }])
    expect(svg).toContain('<text')
    expect(svg).not.toContain('<script')
    expect(svg).toContain('&#60;script&#62;')
  })

  it('escapes the accessible label', () => {
    expect(render([{ title: 'a" onload="x' }])).toContain('aria-label="a&#34; onload=&#34;x"')
  })

  it('refuses icon paths that are not path data', () => {
    const svg = render([{ title: 'X', icon: { path: '"/><script>alert(1)</script>' } }])
    expect(svg).not.toContain('script')
  })

  it('embeds prints laid down', () => {
    const svg = render([
      { title: 'Print', href: 'data:image/webp;base64,AAAA', width: 60, height: 720 },
    ])
    expect(svg).toContain('href="data:image/webp;base64,AAAA"')
    expect(size(svg).height).toBe(35) // 60 / 720 × 1200 × 0.35
  })
})

describe('type', () => {
  it('kerns and tracks', () => {
    const plain = set('AVAV', { face: 'serif', cap: 100 })
    const tracked = set('AVAV', { face: 'serif', cap: 100, tracking: 0.1 })
    expect(tracked.width).toBeGreaterThan(plain.width)
  })

  it('shrinks first, then cuts with an ellipsis', () => {
    const type = { face: 'sans', cap: 40 } as const
    const shrunk = fit('A fairly long title', type, set('A fairly long title', type).width * 0.8)
    expect(shrunk.cap).toBeLessThan(40)

    const cut = fit('An extraordinarily long title that cannot fit', type, 200)
    expect(cut.width).toBeLessThanOrEqual(200)
  })
})

describe('helpers', () => {
  it('normalizes hex colors', () => {
    expect(hex('FFF')).toBe('#ffffff')
    expect(hex('#3178C6')).toBe('#3178c6')
    expect(hex('red')).toBeUndefined()
    expect(hex('#12345')).toBeUndefined()
  })

  it('picks a stable theme from the title', () => {
    expect(themeFor('Hello')).toBe(themeFor('hello'))
    expect(themeIds).toContain(themeFor('anything'))
  })
})
