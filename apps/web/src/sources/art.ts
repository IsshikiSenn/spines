import type { Print } from '@repo/spine'
import manifest from '../art.generated.json' with { type: 'json' }
import { type Env, HttpError } from '../http.ts'

interface Entry {
  title: string
  group: string
  width: number
  height: number
}

const prints: Record<string, Entry> = manifest

export const gallery = Object.entries(prints).map(([slug, { title, group, width, height }]) => ({
  slug,
  title,
  group,
  width,
  height,
}))

export function hasPrint(slug: string): boolean {
  return Object.hasOwn(prints, slug)
}

/**
 * Loads a gallery print — a finished spine made with the cd-spine-art skill —
 * inlined as a data URI, because an SVG shown through <img> may not fetch.
 */
export async function print(slug: string, env: Env, origin: string): Promise<Print> {
  const entry = Object.hasOwn(prints, slug) ? prints[slug] : undefined
  if (!entry) throw new HttpError(404, `no print called ${slug}`)

  const response = await env.ASSETS.fetch(`${origin}/art/${slug}.webp`)
  if (!response.ok) throw new HttpError(502, `print ${slug} is missing`)
  const { title, width, height } = entry
  return {
    title,
    width,
    height,
    href: `data:image/webp;base64,${base64(await response.arrayBuffer())}`,
  }
}

function base64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}
