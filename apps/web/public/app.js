const form = document.querySelector('#form')
const preview = document.querySelector('#preview')
const field = (name) => form.elements[name]

/** Layout and length each kind starts from, matching the server's defaults. */
const defaults = {
  badge: { layout: 'stack', size: 420 },
  spine: { layout: 'stack', size: 420 },
  repo: { layout: 'stack', size: 420 },
  account: { layout: 'row', size: 480 },
  shelf: { layout: 'row', size: 480 },
}

const state = { mode: 'badge', theme: '', width: 'regular', layout: 'stack', readme: 'dark' }

const badgeList = () =>
  field('badges')
    .value.split(',')
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean)

/** What the server does when no layout is given: several badges stand, one lies down. */
const serverLayout = () =>
  state.mode === 'badge' && badgeList().length > 1 ? 'row' : defaults[state.mode].layout

function path() {
  switch (state.mode) {
    case 'badge':
      return `/badge/${badgeList().map(encodeURIComponent).join(',') || 'typescript'}.svg`
    case 'spine':
      return `/spine/${encodeURIComponent(field('title').value.trim() || 'Untitled')}.svg`
    case 'repo':
      return `/gh/${field('repo').value.trim().split('/').map(encodeURIComponent).join('/')}.svg`
    case 'account':
      return `/gh/${encodeURIComponent(field('account').value.trim())}.svg`
    case 'shelf':
      return '/shelf.svg'
  }
}

function query() {
  const q = new URLSearchParams()
  const { mode } = state
  const set = (key, value, fallback = '') => {
    if (value && String(value) !== String(fallback)) q.set(key, value)
  }

  if (mode === 'shelf') {
    for (const line of field('items').value.split('\n')) {
      if (line.trim()) q.append('s', line.trim())
    }
  } else {
    set('theme', state.theme)
    set('width', state.width, 'regular')
  }
  if (mode !== 'shelf' && mode !== 'account') {
    set('sub', field('sub').value.trim())
    set('icon', field('icon').value.trim().toLowerCase())
  }
  if (mode === 'account') set('count', field('count').value, 8)
  set('layout', state.layout, serverLayout())
  set('size', field('size').value, defaults[mode].size)
  return q.toString()
}

const snippets = {}
let timer
function update({ now = false } = {}) {
  field('sizeOut').value = field('size').value
  field('countOut').value = field('count').value

  const search = query()
  const relative = path() + (search ? `?${search}` : '')
  const absolute = location.origin + relative
  const alt = state.mode === 'spine' ? field('title').value.trim() : 'CD spines'

  snippets.url = absolute
  snippets.md = `![${alt.replace(/[[\]]/g, '')}](${absolute})`
  snippets.html = `<img src="${absolute.replace(/&/g, '&amp;')}" alt="${alt.replace(/"/g, '&quot;')}">`
  document.querySelector('#md').textContent = snippets.md

  const chosen = new Set(badgeList())
  for (const chip of document.querySelectorAll('#chips button')) {
    chip.setAttribute('aria-pressed', String(chosen.has(chip.dataset.slug)))
  }

  clearTimeout(timer)
  timer = setTimeout(
    () => {
      if (preview.getAttribute('src') === relative) return
      preview.classList.add('loading')
      preview.src = relative
    },
    now ? 0 : 250,
  )
}

preview.addEventListener('load', () => preview.classList.remove('loading'))
preview.addEventListener('error', () => preview.classList.remove('loading'))

/** Reflects a choice in its segmented control. */
function show(choice, value) {
  for (const option of document.querySelectorAll(`[data-choice=${choice}] button`)) {
    option.setAttribute('aria-checked', String(option.dataset.value === value))
  }
}

function choose(choice, value) {
  state[choice] = value
  show(choice, value)
  if (choice === 'readme') {
    const stage = document.querySelector('#stage')
    stage.classList.toggle('light', value === 'light')
    stage.classList.toggle('dark', value === 'dark')
  }
  update({ now: true })
}

function setMode(mode) {
  state.mode = mode
  for (const tab of form.querySelectorAll('[role=tab]')) {
    tab.setAttribute('aria-selected', String(tab.dataset.mode === mode))
  }
  for (const el of form.querySelectorAll('[data-for]')) {
    el.hidden = !el.dataset.for.split(' ').includes(mode)
  }
  field('size').value = defaults[mode].size
  choose('layout', serverLayout())
}

function setTheme(id) {
  state.theme = id
  for (const button of document.querySelectorAll('#themes button')) {
    button.setAttribute('aria-pressed', String(button.dataset.theme === id))
  }
  update({ now: true })
}

form.addEventListener('input', () => update())
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

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
    say('Copied')
  } catch {
    say('Could not copy')
  }
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

const themes = document.querySelector('#themes')
for (const { id, label, paper } of [{ id: '', label: 'Auto' }, ...meta.themes]) {
  const button = Object.assign(document.createElement('button'), {
    type: 'button',
    title: label,
    ariaLabel: label,
    className: id ? '' : 'auto',
    onclick: () => setTheme(id),
  })
  if (paper) button.style.background = paper
  button.dataset.theme = id
  themes.append(button)
}
document.querySelector('#theme-list').innerHTML = meta.themes
  .map(({ id }) => `<code>${id}</code>`)
  .join(' ')

const chips = document.querySelector('#chips')
for (const { slug, title } of meta.badges) {
  const chip = Object.assign(document.createElement('button'), {
    type: 'button',
    textContent: title,
    onclick: () => {
      const list = badgeList()
      const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]
      field('badges').value = next.join(',')
      if (state.mode === 'badge') choose('layout', serverLayout())
    },
  })
  chip.dataset.slug = slug
  chips.append(chip)
}

const gallery = document.querySelector('#gallery')
for (const { slug, title } of meta.prints) {
  const button = Object.assign(document.createElement('button'), {
    type: 'button',
    title: `Copy ${slug}`,
    onclick: () => copy(slug),
  })
  button.append(
    Object.assign(new Image(), {
      src: `/art/${slug}.webp`,
      alt: `${title} spine`,
      loading: 'lazy',
    }),
  )
  gallery.append(button)
}

setTheme('')
setMode('badge')
