const form = document.querySelector('#form')
const preview = document.querySelector('#preview')
const search = document.querySelector('#search')
const popup = document.querySelector('#popup')
const results = document.querySelector('#results')
const facets = document.querySelector('#facets')
const tokens = document.querySelector('#tokens')
const field = (name) => form.elements[name]

/** What a shelf holds and how many of its spines may read GitHub; the server's limits. */
const MAX_SHELF = 24
const MAX_REPOS = 12

/** Layout and length the server picks when none is given: one spine lies down, several stand. */
const LYING = { layout: 'stack', size: 420 }
const STANDING = { layout: 'row', size: 480 }

const groupNames = { ai: 'AI', models: 'Models', stack: 'Stack', projects: 'Projects' }

const state = {
  mode: 'shelf',
  /** Spines on the shelf, in order: `{ kind: 'badge' | 'print' | 'repo' | 'title', value, label }`. */
  shelf: [],
  /** Set once the reader picks a layout or length, so adding spines stops changing them. */
  layout: undefined,
  sized: false,
  query: '',
  facet: 'all',
  options: [],
  active: -1,
}

/** Searchable catalog, built from /api/meta: every preset and every print, once each. */
let catalog = []

const keyOf = (item) =>
  ({ badge: 'badge:', print: 'art:', repo: 'gh:', title: '' })[item.kind] + item.value
const has = (item) => state.shelf.some((other) => keyOf(other) === keyOf(item))

// ——— Search ———

const fold = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '')

/**
 * Ranks an entry against the query: exact names first, then prefixes, word
 * starts and substrings, then letters in order. Names, slugs and short names
 * all count, and punctuation is ignored, so `next js`, `nextjs` and `next.js`
 * find the same thing.
 */
function score(entry, query) {
  const q = fold(query)
  if (!q) return 1
  let best = 0
  for (const [name, weight] of entry.names) {
    const words = name.toLowerCase().split(/[^a-z0-9]+/)
    const folded = fold(name)
    let s = 0
    if (folded === q) s = 100
    else if (folded.startsWith(q)) s = 80 - Math.min(folded.length - q.length, 20) / 2
    else if (words.some((word) => word.startsWith(q))) s = 60
    else if (folded.includes(q)) s = 40
    else if (q.length > 2 && inOrder(q, folded)) s = 15
    best = Math.max(best, s * weight)
  }
  return best
}

function inOrder(needle, haystack) {
  let at = 0
  for (const char of haystack) if (char === needle[at]) at++
  return at === needle.length
}

/** Text that isn't in the catalog can still be shelved: a repository, a profile, or a title. */
function guesses(query) {
  const text = query.trim()
  if (!text) return []
  const out = []
  const url = text.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)(?:\/([\w.-]+))?/i)
  const slash = text.match(/^([\w-]+)\/([\w.-]+)$/)
  const repo = url?.[2]
    ? [url[1], url[2].replace(/\.git$/, '')]
    : slash
      ? [slash[1], slash[2]]
      : null
  if (repo) {
    const value = repo.join('/')
    out.push({ kind: 'repo', value, label: value })
  }
  const account = (url && !url[2] && url[1]) || text.match(/^@([\w-]+)$/)?.[1]
  if (account) out.push({ kind: 'profile', value: account, label: account })
  if (!url) out.push({ kind: 'title', value: text.slice(0, 80), label: text.slice(0, 80) })
  return out
}

function filter() {
  const { query, facet } = state
  const pool = catalog.filter((entry) => facet === 'all' || entry.group === facet)
  if (!query.trim()) return pool
  return pool
    .map((entry) => ({ entry, s: score(entry, query) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .map(({ entry }) => entry)
}

function renderFacets() {
  const counts = {}
  for (const entry of catalog) counts[entry.group] = (counts[entry.group] ?? 0) + 1
  const ids = ['all', ...Object.keys(groupNames).filter((id) => counts[id])]
  facets.replaceChildren(
    ...ids.map((id) => {
      const button = el('button', { type: 'button', className: 'facet' })
      button.dataset.facet = id
      button.setAttribute('aria-pressed', String(state.facet === id))
      button.append(
        id === 'all' ? 'All' : groupNames[id],
        el('span', { textContent: id === 'all' ? catalog.length : counts[id] }),
      )
      return button
    }),
  )
}

function renderResults() {
  const matches = filter()
  const extra = state.facet === 'all' ? guesses(state.query) : []
  // A guess that names something in the catalog exactly would only repeat it.
  const exact = matches[0] && fold(matches[0].title) === fold(state.query)
  const lead = extra.filter((g) => g.kind !== 'title')
  const tail = exact ? [] : extra.filter((g) => g.kind === 'title')
  state.options = [...lead, ...matches.map((entry) => ({ ...entry, entry })), ...tail]
  state.active = state.options.length ? 0 : -1

  const browsing = !state.query.trim()
  const items = []
  let group
  state.options.forEach((option, i) => {
    if (browsing && state.facet === 'all' && option.entry && option.group !== group) {
      group = option.group
      items.push(
        el('div', {
          role: 'presentation',
          className: 'group',
          textContent: groupNames[group] ?? group,
        }),
      )
    }
    items.push(renderOption(option, i))
  })
  if (!items.length) {
    items.push(
      el('div', {
        role: 'presentation',
        className: 'none',
        textContent: 'Nothing in this group matches.',
      }),
    )
  }
  results.replaceChildren(...items)
  highlight()

  const found = matches.length
  announce(
    browsing
      ? ''
      : found
        ? `${found} ${found === 1 ? 'match' : 'matches'}`
        : 'No matches in the catalog',
  )
}

function renderOption(option, i) {
  const li = el('div', { role: 'option', id: `option-${i}`, className: `option ${option.kind}` })
  li.dataset.index = i
  const chosen = option.kind !== 'profile' && has(option)
  li.setAttribute('aria-selected', String(chosen))

  const label = el('span', { className: 'option-label' })
  if (option.entry) {
    label.append(mark(option.title, state.query))
    const typed = fold(state.query)
    const alias = typed && option.aliases.find((a) => fold(a) === typed)
    const meta = el('span', { className: 'option-meta' })
    meta.append(el('code', { textContent: alias ? `${alias} → ${option.slug}` : option.slug }))
    if (typed && state.facet === 'all') {
      meta.append(
        el('span', { className: 'tag', textContent: groupNames[option.group] ?? option.group }),
      )
    }
    li.append(thumb(option), label, meta)
  } else {
    label.append(
      el('strong', { textContent: option.kind === 'title' ? `“${option.label}”` : option.label }),
    )
    li.append(glyph(option.kind), label)
  }
  li.append(el('span', { className: 'check', 'aria-hidden': 'true' }))
  return li
}

/** The title with the matched part marked, for scanning a long list. */
function mark(title, query) {
  const q = query.trim().toLowerCase()
  const at = q ? title.toLowerCase().indexOf(q) : -1
  const span = el('span')
  if (at < 0) span.textContent = title
  else
    span.append(
      title.slice(0, at),
      el('mark', { textContent: title.slice(at, at + q.length) }),
      title.slice(at + q.length),
    )
  return span
}

/** The print itself, laid down small, so a result looks like what it adds. */
function thumb(entry) {
  const box = el('span', { className: 'thumb', 'aria-hidden': 'true' })
  if (entry.print) {
    const { width, height } = entry.print
    box.style.setProperty('--ratio', String(width / height))
    box.append(
      el('img', {
        src: `/art/${entry.slug}.webp`,
        alt: '',
        loading: 'lazy',
        decoding: 'async',
        width,
        height,
      }),
    )
  }
  return box
}

function glyph(kind) {
  const text = { repo: 'gh:', profile: '@', title: 'Aa' }[kind] ?? ''
  return el('span', { className: 'thumb glyph', 'aria-hidden': 'true', textContent: text })
}

function highlight() {
  for (const option of results.querySelectorAll('[role=option]')) {
    option.classList.toggle('active', Number(option.dataset.index) === state.active)
  }
  const active = state.active >= 0 ? results.querySelector(`#option-${state.active}`) : null
  if (active) {
    search.setAttribute('aria-activedescendant', active.id)
    active.scrollIntoView({ block: 'nearest' })
  } else search.removeAttribute('aria-activedescendant')
}

function open() {
  if (!popup.hidden) return
  popup.hidden = false
  search.setAttribute('aria-expanded', 'true')
  renderFacets()
  renderResults()
}

function close() {
  popup.hidden = true
  search.setAttribute('aria-expanded', 'false')
  search.removeAttribute('aria-activedescendant')
}

function pick(option) {
  if (!option) return
  if (option.kind === 'profile') {
    field('account').value = option.value
    clearQuery()
    close()
    setMode('account')
    return
  }
  const item = {
    kind: option.kind,
    value: option.kind === 'badge' || option.kind === 'print' ? option.slug : option.value,
    label: option.title ?? option.label,
  }
  if (has(item)) remove(state.shelf.findIndex((other) => keyOf(other) === keyOf(item)))
  else if (!add(item)) return
  clearQuery()
  renderResults()
}

function clearQuery() {
  search.value = ''
  state.query = ''
}

search.addEventListener('focus', open)
search.addEventListener('click', open)
search.addEventListener('input', () => {
  state.query = search.value
  if (popup.hidden) open()
  else renderResults()
})
search.addEventListener('blur', () =>
  setTimeout(() => {
    if (!popup.contains(document.activeElement)) close()
  }, 0),
)

search.addEventListener('keydown', (event) => {
  const count = state.options.length
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp': {
      event.preventDefault()
      if (popup.hidden) return open()
      if (!count) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      state.active = (state.active + step + count) % count
      return highlight()
    }
    case 'Enter':
      event.preventDefault()
      if (!popup.hidden) pick(state.options[state.active])
      return
    case 'Escape':
      if (search.value) {
        clearQuery()
        renderResults()
      } else close()
      return
    case 'Backspace':
      if (!search.value && state.shelf.length) remove(state.shelf.length - 1)
      return
    case 'Tab':
      close()
  }
})

// Clicks in the popup must not take focus from the search, or it would close.
popup.addEventListener('mousedown', (event) => event.preventDefault())
popup.addEventListener('click', (event) => {
  const facet = event.target.closest('[data-facet]')?.dataset.facet
  if (facet) {
    state.facet = facet
    renderFacets()
    renderResults()
    return
  }
  const option = event.target.closest('[role=option]')
  if (option) pick(state.options[Number(option.dataset.index)])
})
results.addEventListener('mousemove', (event) => {
  const index = event.target.closest('[role=option]')?.dataset.index
  if (index !== undefined && Number(index) !== state.active) {
    state.active = Number(index)
    for (const option of results.querySelectorAll('[role=option]')) {
      option.classList.toggle('active', Number(option.dataset.index) === state.active)
    }
  }
})

document.addEventListener('mousedown', (event) => {
  if (!document.querySelector('#picker').contains(event.target)) close()
})

// `/` or ⌘K jumps to search from anywhere, as on shields.io and most docs sites.
document.addEventListener('keydown', (event) => {
  const typing = event.target.closest?.('input, textarea, [contenteditable]')
  const slash = event.key === '/' && !typing
  const command = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)
  if (!slash && !command) return
  event.preventDefault()
  if (state.mode !== 'shelf') setMode('shelf')
  search.focus()
  search.select()
})

// ——— The shelf ———

/** Key of the spine just added, so only it enters; renders after this one leave it still. */
let fresh = null

function add(item, { quiet = false } = {}) {
  if (has(item)) {
    if (!quiet) say(`${item.label} is already on the shelf`)
    return false
  }
  if (state.shelf.length >= MAX_SHELF) {
    say(`A shelf holds ${MAX_SHELF} spines at most`)
    return false
  }
  if (item.kind === 'repo' && state.shelf.filter((i) => i.kind === 'repo').length >= MAX_REPOS) {
    say(`A shelf reads ${MAX_REPOS} repositories at most`)
    return false
  }
  state.shelf.push(item)
  announce(`Added ${item.label}`)
  fresh = keyOf(item)
  changed()
  fresh = null
  return true
}

function remove(index) {
  const [item] = state.shelf.splice(index, 1)
  if (!item) return
  announce(`Removed ${item.label}`)
  changed()
  if (!popup.hidden) renderResults()
}

function move(from, to) {
  if (from === to) return
  const [item] = state.shelf.splice(from, 1)
  state.shelf.splice(to, 0, item)
  changed()
}

function changed() {
  renderTokens()
  update({ now: true })
}

function renderTokens() {
  tokens.replaceChildren(
    ...state.shelf.map((item, i) => {
      const li = el('li', { className: `token ${item.kind}`, draggable: true })
      li.dataset.index = i
      if (keyOf(item) === fresh) li.classList.add('enter')
      const entry =
        item.kind === 'badge' || item.kind === 'print'
          ? catalog.find((e) => e.slug === item.value)
          : null
      li.append(
        entry ? thumb(entry) : glyph(item.kind),
        el('span', {
          className: 'token-label',
          textContent: item.kind === 'title' ? `“${item.label}”` : item.label,
        }),
        el('button', {
          type: 'button',
          className: 'token-remove',
          'aria-label': `Remove ${item.label}`,
          title: 'Remove',
        }),
      )
      return li
    }),
  )
  document.querySelector('#tally').value = state.shelf.length
    ? `${state.shelf.length} / ${MAX_SHELF}`
    : ''
  search.placeholder =
    state.shelf.length >= MAX_SHELF
      ? 'The shelf is full'
      : state.shelf.length
        ? 'Add another…'
        : `Search ${catalog.length || ''} tools, or type a title or owner/repo`
}

tokens.addEventListener('click', (event) => {
  const button = event.target.closest('.token-remove')
  if (!button) return
  const index = Number(button.closest('.token').dataset.index)
  remove(index)
  // Keep the keyboard where it was: on the next spine's remove button, or the search.
  const next = tokens.querySelectorAll('.token-remove')[Math.min(index, state.shelf.length - 1)]
  ;(next ?? search).focus()
})

tokens.addEventListener('keydown', (event) => {
  const token = event.target.closest('.token')
  if (!token || !event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  const from = Number(token.dataset.index)
  const to = Math.min(
    state.shelf.length - 1,
    Math.max(0, from + (event.key === 'ArrowLeft' ? -1 : 1)),
  )
  move(from, to)
  tokens.querySelectorAll('.token-remove')[to]?.focus()
})

let dragging = -1
tokens.addEventListener('dragstart', (event) => {
  const token = event.target.closest('.token')
  if (!token) return
  dragging = Number(token.dataset.index)
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', keyOf(state.shelf[dragging]))
  requestAnimationFrame(() => token.classList.add('dragging'))
})
tokens.addEventListener('dragover', (event) => {
  if (dragging < 0) return
  event.preventDefault()
  const over = event.target.closest('.token')
  for (const token of tokens.children)
    token.classList.toggle('over', token === over && Number(token.dataset.index) !== dragging)
})
tokens.addEventListener('drop', (event) => {
  event.preventDefault()
  const over = event.target.closest('.token')
  if (over && dragging >= 0) move(dragging, Number(over.dataset.index))
})
tokens.addEventListener('dragend', () => {
  dragging = -1
  for (const token of tokens.children) token.classList.remove('dragging', 'over')
})

// ——— The URL ———

const only = (kind) => state.shelf.length > 0 && state.shelf.every((item) => item.kind === kind)
/** One plain spine may carry its own catalog line and icon; prints are finished art and take neither. */
const single = () =>
  state.mode === 'shelf' && state.shelf.length === 1 && state.shelf[0].kind !== 'print'

function fallback() {
  if (state.mode === 'account') return STANDING
  return state.shelf.length > 1 ? STANDING : LYING
}

/** The shortest route that draws the shelf, so the README's URL stays readable. */
function path() {
  const { shelf } = state
  const list = () => shelf.map((item) => encodeURIComponent(item.value)).join(',')
  if (state.mode === 'account')
    return `/gh/${encodeURIComponent(field('account').value.trim() || 'octocat')}.svg`
  if (only('badge')) return `/badge/${list()}.svg`
  if (only('print')) return `/art/${list()}.svg`
  if (shelf.length === 1 && shelf[0].kind === 'title')
    return `/spine/${encodeURIComponent(shelf[0].value)}.svg`
  if (shelf.length === 1 && shelf[0].kind === 'repo')
    return `/gh/${shelf[0].value.split('/').map(encodeURIComponent).join('/')}.svg`
  return '/shelf.svg'
}

function query() {
  const q = new URLSearchParams()
  const set = (key, value, otherwise = '') => {
    if (value && String(value) !== String(otherwise)) q.set(key, value)
  }
  if (path() === '/shelf.svg') {
    // `;` separates a shelf item's options, so a title may not contain one.
    for (const item of state.shelf) q.append('s', keyOf(item).replaceAll(';', ','))
  }
  if (single()) {
    set('sub', field('sub').value.trim())
    set('icon', field('icon').value.trim().toLowerCase())
  }
  if (state.mode === 'account') set('count', field('count').value, 8)
  const base = fallback()
  set('layout', state.layout ?? base.layout, base.layout)
  set('size', field('size').value, base.size)
  // Leave the separators shelf items use readable; the server reads them either way.
  return [...q]
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(value)
          .replace(/%(3A|2F|2C)/gi, decodeURIComponent)
          .replaceAll('%20', '+')}`,
    )
    .join('&')
}

const snippets = {}
let timer
function update({ now = false } = {}) {
  const base = fallback()
  if (!state.sized) field('size').value = base.size
  show('layout', state.layout ?? base.layout)
  field('sizeOut').value = field('size').value
  field('countOut').value = field('count').value
  for (const el of form.querySelectorAll('[data-for]')) {
    const wants = el.dataset.for.split(' ')
    el.hidden = !(wants.includes(state.mode) || (wants.includes('single') && single()))
  }

  const empty = state.mode === 'shelf' && !state.shelf.length
  for (const button of document.querySelectorAll('[data-copy]')) button.disabled = empty
  clearTimeout(timer)
  if (empty) {
    document.querySelector('#md').textContent = ''
    shelve([])
    return
  }

  const params = query()
  const relative = path() + (params ? `?${params}` : '')
  const absolute = location.origin + relative
  const alt =
    state.mode === 'account'
      ? `${field('account').value.trim()} on GitHub`
      : state.shelf.map((item) => item.label).join(', ')

  snippets.url = absolute
  snippets.md = `![${alt.replace(/[[\]]/g, '')}](${absolute})`
  snippets.html = `<img src="${absolute.replace(/&/g, '&amp;')}" alt="${alt.replace(/"/g, '&quot;')}">`
  document.querySelector('#md').textContent = snippets.md

  const list = spines(relative, alt)
  const layout = state.layout ?? base.layout
  const entering = fresh
  timer = setTimeout(() => shelve(list, { layout, entering }), now ? 0 : 250)
}

/**
 * The preview draws each spine as its own image, laid out as the server lays out
 * the shelf, so a spine can arrive or leave while the others stay put. One spine,
 * or an account's shelf, is the copied URL itself.
 */
function spines(relative, alt) {
  if (state.mode === 'account') return [{ key: 'account', src: relative, alt }]
  if (state.shelf.length === 1) return [{ key: keyOf(state.shelf[0]), src: relative, alt }]
  const layout = state.layout ?? STANDING.layout
  const size = field('size').value
  return state.shelf.map((item) => {
    const s = keyOf(item).replaceAll(';', ',')
    return {
      key: keyOf(item),
      src: `/shelf.svg?${new URLSearchParams({ s, layout, size })}`,
      alt: item.label,
    }
  })
}

function shelve(list, { layout, entering = null } = {}) {
  if (layout) preview.dataset.layout = layout
  const current = new Map()
  for (const node of preview.children) {
    if (!node.classList.contains('leave')) current.set(node.dataset.key, node)
  }
  const nodes = list.map(({ key, src, alt }) => {
    let img = current.get(key)
    current.delete(key)
    if (!img) {
      img = el('img', { alt, hidden: true, decoding: 'async' })
      img.dataset.key = key
      // A new spine waits, unseen, until it can arrive whole.
      if (key === entering) img.dataset.enter = ''
      img.addEventListener('load', () => reveal(img))
      img.addEventListener('error', () => reveal(img))
      img.addEventListener('animationend', () => img.classList.remove('enter'))
    }
    img.alt = alt
    if (img.getAttribute('src') !== src) {
      if (!img.hidden) img.classList.add('loading')
      img.src = src
    }
    return img
  })
  for (const node of current.values()) leave(node)

  // Move only what is out of order: moving a node restarts its animation.
  nodes.forEach((node, i) => {
    let before = node.previousElementSibling
    while (before?.classList.contains('leave')) before = before.previousElementSibling
    if (node.isConnected && before === (nodes[i - 1] ?? null)) return
    if (i === 0) preview.prepend(node)
    else nodes[i - 1].after(node)
  })
}

function reveal(img) {
  img.classList.remove('loading')
  if (!img.hidden) return
  img.hidden = false
  if ('enter' in img.dataset) img.classList.add('enter')
  delete img.dataset.enter
}

function leave(node) {
  if (node.hidden) return node.remove()
  node.classList.remove('enter')
  node.classList.add('leave')
  node.addEventListener('animationend', () => node.remove())
  setTimeout(() => node.remove(), 400)
}

/** Reflects a choice in its segmented control. */
function show(choice, value) {
  for (const option of document.querySelectorAll(`[data-choice=${choice}] button`)) {
    option.setAttribute('aria-checked', String(option.dataset.value === value))
  }
}

function choose(choice, value) {
  state[choice] = value
  show(choice, value)
  update({ now: true })
}

function setMode(mode) {
  state.mode = mode
  state.layout = undefined
  state.sized = false
  for (const tab of form.querySelectorAll('[role=tab]')) {
    tab.setAttribute('aria-selected', String(tab.dataset.mode === mode))
  }
  if (mode !== 'shelf') close()
  update({ now: true })
}

form.addEventListener('input', (event) => {
  if (event.target === search) return
  if (event.target === field('size')) state.sized = true
  update()
})
form.addEventListener('submit', (event) => event.preventDefault())

document.addEventListener('click', (event) => {
  const mode = event.target.closest('[data-mode]')?.dataset.mode
  if (mode) return setMode(mode)

  const option = event.target.closest('[data-choice] button')
  if (option) return choose(option.closest('[data-choice]').dataset.choice, option.dataset.value)

  const kind = event.target.closest('[data-copy]')?.dataset.copy
  if (kind) copy(snippets[kind])
})

const toast = document.querySelector('#toast')
let toastTimer
function say(message) {
  toast.textContent = message
  toast.classList.add('on')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.classList.remove('on'), 1600)
}

const announcer = document.querySelector('#announce')
function announce(message) {
  announcer.textContent = message
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
    say('Copied')
  } catch {
    say('Could not copy')
  }
}

function el(tag, props = {}) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('aria-') || key === 'role') node.setAttribute(key, value)
    else node[key] = value
  }
  return node
}

// The hero is a real shelf; its caption is the URL that drew it.
const heroUrl =
  '/shelf.svg?' +
  ['art:chatgpt', 'badge:claude', 'badge:cursor', 'badge:typescript', 'badge:go', 'badge:react']
    .concat([
      'art:magpie',
      'badge:docker',
      'art:pinky',
      'badge:rust',
      'art:lobehub',
      'badge:python',
    ])
    .concat(['art:arion', 'badge:cloudflare', 'art:mole'])
    .map((item) => `s=${item}`)
    .join('&')
document.querySelector('#hero').src = `${heroUrl}&size=480`
document.querySelector('#hero-url').textContent = heroUrl

// Themes, badges and prints come from the server, so this page never drifts from it.
const meta = await fetch('/api/meta').then((r) => r.json())

document.querySelector('#theme-list').innerHTML = meta.themes
  .map(({ id }) => `<code>${id}</code>`)
  .join(' ')

const prints = new Map(meta.prints.map((p) => [p.slug, p]))
const badgeSlugs = new Set(meta.badges.map((b) => b.slug))
catalog = [
  ...meta.badges.map(({ slug, title, group, aliases }) => ({
    kind: 'badge',
    slug,
    title,
    group,
    aliases,
    print: prints.get(slug),
  })),
  // Prints of things outside the catalog, such as model families and projects.
  ...meta.prints
    .filter((p) => !badgeSlugs.has(p.slug))
    .map((p) => ({
      kind: 'print',
      slug: p.slug,
      title: p.title,
      group: p.group,
      aliases: [],
      print: p,
    })),
]
for (const entry of catalog) {
  entry.names = [
    [entry.title, 1],
    [entry.slug, 0.95],
    ...entry.aliases.map((alias) => [alias, 0.9]),
  ]
}
const order = Object.keys(groupNames)
catalog.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group))

const gallery = document.querySelector('#gallery')
for (const { slug, title } of meta.prints) {
  const entry = catalog.find((e) => e.slug === slug)
  const button = el('button', {
    type: 'button',
    onclick: () => {
      if (state.mode !== 'shelf') setMode('shelf')
      add({ kind: entry.kind, value: slug, label: title })
    },
  })
  button.append(el('img', { src: `/art/${slug}.webp`, alt: `${title} spine`, loading: 'lazy' }))
  gallery.append(button)
}

for (const slug of ['typescript', 'react', 'docker', 'claude']) {
  const entry = catalog.find((e) => e.slug === slug)
  if (entry) state.shelf.push({ kind: entry.kind, value: slug, label: entry.title })
}
renderTokens()
setMode('shelf')
