import Link from 'next/link'
import { TOPICS, PERSONAS } from '@/lib/blog/store'

function fmtDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

export default function PostCard({ post, featured = false }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex flex-col rounded-xl border border-[#262B2D] bg-[#101314] no-underline transition-colors hover:border-[#3a4144] ${featured ? 'p-7' : 'p-5'}`}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#6E7772]">
        <span className="text-[#C6F24E]">{TOPICS[post.topic] || post.topic}</span>
        {post.persona && <span>· {PERSONAS[post.persona] || post.persona}</span>}
      </div>
      <h3 className={`mt-2 font-semibold leading-snug text-[#ECEFEA] group-hover:text-[#C6F24E] ${featured ? 'text-2xl' : 'text-[17px]'}`}>
        {post.title}
      </h3>
      <p className={`mt-2 text-[#A3ABA6] ${featured ? 'text-[15px]' : 'text-[13.5px]'} leading-relaxed`}>
        {post.excerpt || post.answer}
      </p>
      <div className="mt-auto pt-4 text-[12px] text-[#6E7772]">
        {fmtDate(post.published_at)}{post.reading_min ? ` · ${post.reading_min} min read` : ''}
      </div>
    </Link>
  )
}
