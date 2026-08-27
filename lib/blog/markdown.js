// Markdown → safe HTML for blog posts, plus a TOC extracted from the same
// pass so headings and anchors can never disagree.
//
// Why marked + sanitize-html (not remark/rehype): two small pure-JS deps,
// no native builds (Windows-safe), GFM tables/code out of the box. Content
// is authored by our own agents/admin, but it is still sanitised on render
// because humans paste things into the CMS.
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { slugify } from './store'

const SITE_HOSTS = new Set(['workflowstacks.com', 'www.workflowstacks.com'])

function isInternalHref(href) {
  if (!href) return false
  if (href.startsWith('/') || href.startsWith('#')) return true
  try { return SITE_HOSTS.has(new URL(href).hostname) } catch { return false }
}

// Renders body markdown. Returns { html, toc, wordCount }.
export function renderMarkdown(md) {
  const toc = []
  const seen = new Map()
  const renderer = new marked.Renderer()

  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens)
    const plain = text.replace(/<[^>]+>/g, '')
    let id = slugify(plain) || `h-${toc.length + 1}`
    const n = seen.get(id) || 0
    seen.set(id, n + 1)
    if (n) id = `${id}-${n + 1}`
    if (depth === 2 || depth === 3) toc.push({ id, text: plain, depth })
    return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${text}</h${depth}>\n`
  }

  renderer.link = function ({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens)
    const t = title ? ` title="${escapeAttr(title)}"` : ''
    if (isInternalHref(href)) return `<a href="${escapeAttr(href)}"${t}>${text}</a>`
    return `<a href="${escapeAttr(href)}"${t} target="_blank" rel="noopener">${text}</a>`
  }

  renderer.table = function ({ header, rows }) {
    const th = header.map((c) => `<th${c.align ? ` style="text-align:${c.align}"` : ''}>${this.parser.parseInline(c.tokens)}</th>`).join('')
    const body = rows.map((r) => `<tr>${r.map((c) => `<td${c.align ? ` style="text-align:${c.align}"` : ''}>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`).join('')
    return `<div class="tablewrap"><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>\n`
  }

  renderer.code = function ({ text, lang }) {
    const cls = lang ? ` class="language-${escapeAttr(lang)}"` : ''
    return `<div class="codewrap"><pre><code${cls}>${escapeHtml(text)}</code></pre></div>\n`
  }

  marked.setOptions({ gfm: true, breaks: false })
  const raw = marked.parse(md || '', { renderer })

  const html = sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption', 'details', 'summary', 'span', 'h1', 'h2', 'del', 'ins', 'sup', 'sub', 'kbd']),
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel', 'title', 'class', 'aria-hidden'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      code: ['class'],
      pre: ['class'],
      div: ['class'],
      span: ['class'],
      th: ['style'], td: ['style'],
      h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id'],
      details: ['open'],
      '*': ['id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedStyles: { '*': { 'text-align': [/^left$/, /^right$/, /^center$/] } },
    // Only allow class names we render ourselves.
    allowedClasses: {
      div: ['tablewrap', 'codewrap', 'callout', 'callout-warn', 'callout-note'],
      a: ['anchor'],
      code: [/^language-[a-z0-9+-]+$/i],
    },
    transformTags: {
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
    },
  })

  return { html, toc }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function escapeAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;') }

// Assemble the canonical body markdown from the structured post fields, so
// agents and humans edit structure while the page always renders the same
// skeleton (answer → TL;DR → sections → takeaways → questions → sources).
export function assembleBody(post) {
  const parts = []
  for (const s of post.sections || []) {
    if (!s || !s.h2) continue
    parts.push(`## ${s.h2}\n\n${(s.md || '').trim()}\n`)
  }
  if (post.faq && post.faq.length) {
    parts.push('## Questions people ask\n')
    for (const f of post.faq) parts.push(`### ${f.q}\n\n${f.a}\n`)
  }
  return parts.join('\n')
}

// Very light plain-text for search/meta fallbacks.
export function stripMarkdown(md) {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
