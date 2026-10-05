// Renders a digital product's sales page, and the store index, as complete
// standalone HTML documents. Served by app/get/[slug]/route.js and
// app/get/route.js, outside the site's React layout so an ad visitor sees one
// focused page. Styles and behaviour: public/sales/sales.css and sales.js.
//
// Every string in product data is plain text. Two light conventions:
//   **bold**  -> <b>bold</b>        "\n" -> line break
// Nothing else is interpreted, so copy can never inject markup.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ESC[c])
const rich = (s = '') => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')
const plain = (s = '') => String(s).replace(/\*\*(.+?)\*\*/g, '$1')
const list = (items, fn) => (items || []).map(fn).join('')
// JSON inside <script> must not be able to close the tag.
const jsonForScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c')

export function buyHref(p) {
  if (p.checkout?.url) return p.checkout.url
  const text = p.whatsapp?.text || `Hi, I'd like to buy ${p.name}.`
  return `https://wa.me/${p.whatsapp?.number}?text=${encodeURIComponent(text)}`
}

const FONT = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap'

// The WorkflowStacks mark (components/WsMark.js), as markup for static pages.
const WS_MARK = `<svg viewBox="0 0 120 120" fill="currentColor" aria-hidden="true"><polygon points="28,84 60,99 60,106 28,91" fill-opacity="0.30"/><polygon points="92,84 60,99 60,106 92,91" fill-opacity="0.42"/><polygon points="60,69 92,84 60,99 28,84" fill-opacity="0.55"/><polygon points="28,58 60,73 60,80 28,65" fill-opacity="0.40"/><polygon points="92,58 60,73 60,80 92,65" fill-opacity="0.55"/><polygon points="60,43 92,58 60,73 28,58" fill-opacity="0.78"/><polygon points="28,32 60,47 60,54 28,39" fill-opacity="0.55"/><polygon points="92,32 60,47 60,54 92,39" fill-opacity="0.72"/><polygon points="60,17 92,32 60,47 28,32"/></svg>`
const FAVICON = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' rx='26' fill='#C6F24E'/><g fill='#0A0C0D' transform='translate(12 10) scale(.8)'>${WS_MARK.replace(/<\/?svg[^>]*>/g, '')}</g></svg>`)

function head({ title, description, canonical, ogTitle, robots, jsonLd, assetBase }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#0A0C0D">
<link rel="icon" href="${esc(FAVICON)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="WorkflowStacks">
<meta property="og:title" content="${esc(ogTitle || title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT}" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="${FONT}"></noscript>
<link rel="stylesheet" href="${assetBase}/sales.css">
${jsonLd ? `<script type="application/ld+json">${jsonForScript(jsonLd)}</script>` : ''}
</head>`
}

function topBar(p, href) {
  return `<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
  <a class="logo" href="/" aria-label="WorkflowStacks home"><span class="mark">${WS_MARK}</span><span class="wm">workflow<span class="s">stacks</span></span></a>
  <nav aria-label="Shop">
    <a class="link" href="/get">All AI kits</a>
    ${p ? `<a class="btn btn-buy" data-buy="top" href="${esc(href)}">${esc(p.buy.short)}</a>` : `<a class="link" href="/">Skills catalog</a>`}
  </nav>
</div></header>`
}

function phone(d) {
  if (!d) return ''
  const msg = (m) => {
    if (m.chip) return `<div class="ai-chip"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>${esc(m.chip)}</div>`
    return `<div class="b ${m.from === 'out' ? 'out' : 'in'}">${rich(m.text)}${m.time ? `<time>${esc(m.time)}</time>` : ''}</div>`
  }
  return `<figure style="margin:0">
  <div class="phone"><div class="screen">
    <div class="chat-head"><span class="av" aria-hidden="true">${esc((d.contact || '?').slice(0, 1))}</span><div>${esc(d.contact)}<small>${esc(d.status || '')}</small></div></div>
    <div class="chat seq">${list(d.messages, msg)}</div>
  </div></div>
  <figcaption class="phone-note">${esc(d.note)}</figcaption>
</figure>`
}

function demoPanel(d, i) {
  const body = (x) => Array.isArray(x)
    ? `<ul>${list(x, (li) => `<li>${rich(li)}</li>`)}</ul>`
    : `<blockquote>${rich(x)}</blockquote>`
  return `<div role="tabpanel" id="panel-${esc(d.id)}" aria-labelledby="tab-${esc(d.id)}" tabindex="0"${i ? ' hidden' : ''}>
  <div class="demo">
    <div class="card in"><h3>${esc(d.inputLabel)}</h3>${body(d.input)}${d.context ? `<p class="sample" style="margin-top:12px"><b>${esc(d.contextLabel || 'What the owner added')}:</b> ${rich(d.context)}</p>` : ''}</div>
    <div class="arrow" aria-hidden="true">&rarr;</div>
    <div class="card out"><h3>${esc(d.outputLabel)}</h3>${body(d.output)}${d.flag ? `<span class="flag">${esc(d.flag)}</span>` : ''}</div>
  </div>
  ${d.note ? `<p class="sample">${rich(d.note)}</p>` : ''}
</div>`
}

export function renderProductPage(p, { siteUrl, gtmId = '', assetBase = '/sales' } = {}) {
  const url = `${siteUrl}/get/${p.slug}`
  const href = buyHref(p)
  const live = p.status === 'live'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product', '@id': `${url}#product`, name: p.name, description: p.seo.description, url,
        brand: { '@type': 'Brand', name: 'WorkflowStacks' },
        offers: { '@type': 'Offer', price: String(p.price.amount), priceCurrency: p.price.currency, url, availability: 'https://schema.org/InStock' },
      },
      { '@type': 'FAQPage', mainEntity: (p.faq || []).map((f) => ({ '@type': 'Question', name: plain(f.q), acceptedAnswer: { '@type': 'Answer', text: plain(f.a) } })) },
    ],
  }
  const config = {
    slug: p.slug, name: p.name, price: p.price.amount, currency: p.price.currency,
    checkoutUrl: p.checkout?.url || '', whatsapp: p.whatsapp?.number || '', whatsappText: p.whatsapp?.text || '', gtmId,
  }
  const modeAttrs = (n) => `data-mode-text data-checkout-text="${esc(n.checkout)}" data-whatsapp-text="${esc(n.whatsapp)}"`
  const defaultNote = (n) => esc(p.checkout?.url ? n.checkout : n.whatsapp)
  const priceLine = `<b>${esc(p.price.label)}</b>${p.price.note ? ` ${esc(p.price.note)}` : ''} · ${esc(p.price.period)}`

  return `${head({ title: p.seo.title, description: p.seo.description, canonical: url, ogTitle: p.seo.ogTitle, robots: live ? 'index,follow' : 'noindex,nofollow', jsonLd, assetBase })}
<body>
${topBar(p, href)}
<main id="main">

<section class="hero"><div class="wrap grid">
  <div>
    <span class="eyebrow">${esc(p.hero.eyebrow)}</span>
    <h1>${rich(p.hero.headline)}</h1>
    <p class="lede">${rich(p.hero.sub)}</p>
    <div class="cta-row">
      <a class="btn btn-buy" data-buy="hero" href="${esc(href)}">${esc(p.buy.label)}</a>
      <div class="price-tag">${priceLine}</div>
    </div>
    <ul class="checks">${list(p.hero.bullets, (b) => `<li>${rich(b)}</li>`)}</ul>
    <p class="micro" ${modeAttrs(p.buy.note)}>${defaultNote(p.buy.note)}</p>
  </div>
  ${phone(p.hero.demo)}
</div></section>

${p.problem ? `<section class="soft"><div class="wrap">
  <h2>${rich(p.problem.title)}</h2>
  <div class="quotes">${list(p.problem.quotes, (q) => `<span>${esc(q)}</span>`)}</div>
  <p class="lede">${rich(p.problem.body)}</p>
  <div class="cols" style="margin-top:24px">
    <div class="card bad"><h3>${rich(p.problem.before.title)}</h3><p style="margin:0">${rich(p.problem.before.body)}</p></div>
    <div class="card good"><h3>${rich(p.problem.after.title)}</h3><p style="margin:0">${rich(p.problem.after.body)}</p></div>
  </div>
</div></section>` : ''}

${p.demos?.length ? `<section id="demo"><div class="wrap">
  <span class="eyebrow">See it work</span>
  <h2>${rich(p.demosTitle || 'Real jobs in. Ready drafts out.')}</h2>
  <div class="tabs" role="tablist" aria-label="Demos">${list(p.demos, (d, i) => `<button class="tab" role="tab" id="tab-${esc(d.id)}" aria-controls="panel-${esc(d.id)}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-demo="${esc(d.id)}">${esc(d.label)}</button>`)}</div>
  ${list(p.demos, demoPanel)}
</div></section>` : ''}

<section class="soft" id="inside"><div class="wrap">
  <span class="eyebrow">What's inside</span>
  <h2>${rich(p.inside.title)}</h2>
  <p class="lede">${rich(p.inside.intro)}</p>
  <ol class="assist">${list(p.inside.items, (it, i) => `<li><span class="n">${i + 1}</span><div><h3>${esc(it.name)}</h3><p>${rich(it.desc)}</p></div></li>`)}</ol>
  ${p.inside.extras?.length ? `<div class="extras">${list(p.inside.extras, (x) => `<div><b>${esc(x.title)}</b>${rich(x.desc)}</div>`)}</div>` : ''}
</div></section>

${p.steps?.length ? `<section><div class="wrap">
  <span class="eyebrow">How it works</span>
  <h2>${rich(p.stepsTitle || 'Up and running in about 10 minutes')}</h2>
  <ol class="steps">${list(p.steps, (s) => `<li><span class="t">${esc(s.time)}</span><h3>${esc(s.title)}</h3><p style="margin:0">${rich(s.body)}</p></li>`)}</ol>
</div></section>` : ''}

${p.guardrails?.length ? `<section class="soft"><div class="wrap cols" style="align-items:center">
  <div><span class="eyebrow">Built with guardrails</span><h2>${rich(p.guardrailsTitle || 'It asks instead of guessing.')}</h2><p class="lede">${rich(p.guardrailsIntro || '')}</p></div>
  <div class="card"><ul class="checks" style="margin:0">${list(p.guardrails, (g) => `<li>${rich(g)}</li>`)}</ul></div>
</div></section>` : ''}

${p.stats?.length ? `<section><div class="wrap">
  <span class="eyebrow">${esc(p.statsEyebrow || 'Why now')}</span>
  <h2>${rich(p.statsTitle)}</h2>
  <div class="stats">${list(p.stats, (s) => `<div class="stat"><b>${esc(s.value)}</b>${rich(s.text)}<cite>Source: <a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.source)}</a></cite></div>`)}</div>
</div></section>` : ''}

${p.fit ? `<section class="soft fit"><div class="wrap">
  <h2 class="center">${rich(p.fit.title || 'Is it for you?')}</h2>
  <div class="cols" style="margin-top:24px">
    <div class="card yes"><h3>A good fit if you…</h3><ul>${list(p.fit.yes, (y) => `<li>${rich(y)}</li>`)}</ul></div>
    <div class="card no"><h3>Not the right fit if you…</h3><ul>${list(p.fit.no, (n) => `<li>${rich(n)}</li>`)}</ul></div>
  </div>
</div></section>` : ''}

<section id="offer"><div class="wrap offer">
  <div>
    <span class="eyebrow">Everything you get</span>
    <h2>${rich(p.offer.title)}</h2>
    <ul class="stack">${list(p.offer.stack, (s) => `<li><span>${rich(s.item)}</span><span>${esc(s.detail || '')}</span></li>`)}</ul>
    <div class="refund"><span class="seal" aria-hidden="true">7-day<br>refund</span><div><h3 style="margin-bottom:4px">${esc(p.refund.title)}</h3><p style="margin:0">${rich(p.refund.body)}</p></div></div>
  </div>
  <div class="box">
    <div class="label">${esc(p.name)}</div>
    <div class="price">${esc(p.price.label)}${p.price.note ? ` <small>${esc(p.price.note)}</small>` : ''}</div>
    <div class="once">${esc(p.price.period)}</div>
    <a class="btn btn-buy btn-block" data-buy="offer" href="${esc(href)}">${esc(p.buy.label)}</a>
    <p class="micro" ${modeAttrs(p.buy.note)}>${defaultNote(p.buy.note)}</p>
    <ul class="checks">${list(p.offer.boxChecks, (c) => `<li>${rich(c)}</li>`)}</ul>
  </div>
</div></section>

${p.faq?.length ? `<section class="soft"><div class="wrap">
  <h2 class="center">Questions, answered</h2>
  <div class="faq">${list(p.faq, (f) => `<details><summary>${esc(f.q)}</summary><p>${rich(f.a)}</p></details>`)}</div>
</div></section>` : ''}

<section class="final"><div class="wrap center">
  <h2>${rich(p.final.headline)}</h2>
  <p class="lede">${rich(p.final.body)}</p>
  <a class="btn btn-buy" data-buy="final" href="${esc(href)}" style="margin-top:12px">${esc(p.buy.label)}</a>
  <p class="micro" ${modeAttrs(p.buy.note)}>${defaultNote(p.buy.note)}</p>
</div></section>

</main>
<footer><div class="wrap">
  <span><b>WorkflowStacks AI Kits</b> · <a href="${esc(siteUrl)}">workflowstacks.com</a> · <a href="/get">All products</a></span>
  <span>${rich(p.footerNote || '')}</span>
</div></footer>
<div class="sticky" aria-hidden="true">
  <div class="p"><b>${esc(p.price.label)}</b>${esc(p.refund.short || '7-day refund')}</div>
  <a class="btn btn-buy" data-buy="sticky" href="${esc(href)}" tabindex="-1">${esc(p.buy.short)}</a>
</div>
<script type="application/json" id="product-config">${jsonForScript(config)}</script>
<script src="${assetBase}/sales.js" defer></script>
</body>
</html>
`
}

// Store index: every live product as a card.
export function renderStorePage(products, { siteUrl, gtmId = '', assetBase = '/sales' } = {}) {
  const url = `${siteUrl}/get`
  const title = 'AI Kits — Ready-made AI assistants for your business | WorkflowStacks'
  const description = 'Ready-made AI assistant kits for small businesses and property agents in the UAE and India. Works with ChatGPT, Claude or Gemini. One-time price, 7-day refund.'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'WorkflowStacks AI Kits',
    itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${siteUrl}/get/${p.slug}`, name: p.name })),
  }
  const config = { gtmId, items: products.map((p) => ({ item_id: p.slug, item_name: p.name, price: p.price.amount, currency: p.price.currency })) }
  return `${head({ title, description, canonical: url, robots: 'index,follow', jsonLd, assetBase })}
<body>
${topBar(null, '')}
<main id="main">
<section class="hero"><div class="wrap">
  <span class="eyebrow">WorkflowStacks AI Kits</span>
  <h1>Ready-made AI assistants for the jobs that fill your day.</h1>
  <p class="lede">Each kit is ten assistants written for one kind of business, a complete guide and 120 prompts. You describe your business once; the assistants draft in your voice, with your prices. Works with ChatGPT, Claude or Gemini, including free plans.</p>
  <div class="products">${list(products, (p) => `<a class="pcard" href="/get/${esc(p.slug)}" data-item="${esc(p.slug)}">
    <span class="tag">${esc(p.storeTag || p.hero.eyebrow)}</span>
    <h2>${esc(p.name)}</h2>
    <p>${esc(p.card)}</p>
    <span class="row"><b>${esc(p.price.label)}</b><span class="go">See what's inside &rarr;</span></span>
  </a>`)}</div>
  <ul class="checks" style="margin-top:28px">
    <li>One-time payment, no subscription</li>
    <li>7-day no-questions refund</li>
    <li>Every draft is yours to check before you send it</li>
  </ul>
</div></section>
</main>
<footer><div class="wrap">
  <span><b>WorkflowStacks AI Kits</b> · <a href="${esc(siteUrl)}">workflowstacks.com</a></span>
  <span>ChatGPT, Claude and Gemini are trademarks of their respective owners; these kits are not affiliated with or endorsed by them.</span>
</div></footer>
<script type="application/json" id="store-config">${jsonForScript(config)}</script>
<script src="${assetBase}/sales.js" defer></script>
</body>
</html>
`
}
