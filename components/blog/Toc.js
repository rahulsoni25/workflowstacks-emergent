'use client'

// Sticky table of contents with active-section highlight. Collapses to a
// <details> drawer under lg. Receives the toc extracted at render time by
// lib/blog/markdown so anchors always match the headings.
import { useEffect, useState } from 'react'

export default function Toc({ toc }) {
  const [active, setActive] = useState(null)

  useEffect(() => {
    if (!toc?.length || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-80px 0px -70% 0px' }
    )
    for (const item of toc) {
      const el = document.getElementById(item.id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [toc])

  if (!toc || toc.length < 3) return null

  const list = (
    <ul className="m-0 list-none space-y-1 p-0">
      {toc.filter((t) => t.depth === 2).map((t) => (
        <li key={t.id}>
          <a
            href={`#${t.id}`}
            className={`block border-l-2 py-1 pl-3 text-[13px] leading-snug no-underline transition-colors ${
              active === t.id
                ? 'border-[#C6F24E] text-[#ECEFEA]'
                : 'border-[#262B2D] text-[#8A938D] hover:text-[#ECEFEA]'
            }`}
          >
            {t.text}
          </a>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      <nav aria-label="Contents" className="hidden lg:block">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#6E7772]">Contents</div>
        {list}
      </nav>
      <details className="lg:hidden rounded-lg border border-[#262B2D] bg-[#101314] p-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-[#ECEFEA]">Contents</summary>
        <div className="mt-2">{list}</div>
      </details>
    </>
  )
}
