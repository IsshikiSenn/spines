/** Inject the web container at build time so HTML remains a static CDN asset. */
export function withAnalytics(html: string, containerId = ''): string {
  const id = containerId.trim()
  if (id && !/^GTM-[A-Z0-9]+$/.test(id)) {
    throw new Error('GTM_ID must be a Google Tag Manager container ID (GTM-...)')
  }
  const head = id
    ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');</script>`
    : ''
  const body = id
    ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>`
    : ''
  return html.replace('<!-- analytics:head -->', head).replace('<!-- analytics:body -->', body)
}
