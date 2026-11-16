import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { withAnalytics } from '../src/analytics.ts'

const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

describe('analytics build', () => {
  it('places the container script in the head and fallback first in the body', () => {
    const html = withAnalytics(template, 'GTM-TEST123')
    expect(html).toMatch(/<head>\s*<script>/)
    expect(html).toContain("(window,document,'script','dataLayer','GTM-TEST123')")
    expect(html).toMatch(/<body>\s*<noscript><iframe/)
    expect(html).toContain('https://www.googletagmanager.com/ns.html?id=GTM-TEST123')
    expect(html).not.toContain('<!-- analytics:')
  })

  it('omits analytics when no container is configured', () => {
    const html = withAnalytics(template)
    expect(html).not.toContain('googletagmanager.com')
    expect(html).not.toContain('<!-- analytics:')
  })

  it('rejects invalid IDs before they can be injected into HTML', () => {
    expect(() => withAnalytics(template, "GTM-X';alert(1)//")).toThrow('GTM_ID')
    expect(() => withAnalytics(template, 'G-TEST123')).toThrow('GTM_ID')
  })
})
