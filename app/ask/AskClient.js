'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ArrowRight, Star, ExternalLink, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'

const EXAMPLES = [
  'How do I transcribe and summarize meetings automatically?',
  'What tool can scrape a competitor website for pricing?',
  'How do I run AI agents locally without paying for API calls?',
  'What can automate posting to social media?',
  'How do I turn a PDF into structured data?',
  'What tool gives Claude persistent memory across sessions?',
]

function CategoryPill({ category }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono uppercase tracking-wide border border-[#262B2D] text-[#8B928D] bg-[#0A0C0D]">
      {category}
    </span>
  )
}

function ResultCard({ r, rank }) {
  const stars = typeof r.github_stars === 'number' ? r.github_stars.toLocaleString() : null
  const title = r.title_human || r.name
  const desc = r.matched_snippet || r.description_human || r.description
  const href = `https://workflowstacks.com/skills/${r.slug || r.id}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-[#101314] border border-[#262B2D] hover:border-[#C6F24E]/50 rounded-xl p-5 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[#5A615D] font-mono text-xs shrink-0">#{rank}</span>
          <h3 className="text-white font-semibold leading-snug truncate group-hover:text-[#C6F24E] transition-colors">
            {title}
          </h3>
        </div>
        <ExternalLink className="w-4 h-4 text-[#5A615D] group-hover:text-[#C6F24E] shrink-0 transition-colors" />
      </div>
      <p className="text-slate-400 text-sm leading-relaxed mb-3 line-clamp-3">{desc}</p>
      <div className="flex items-center gap-3 flex-wrap">
        {r.category && <CategoryPill category={r.category} />}
        {stars && (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" />
            {stars}
          </span>
        )}
        {r.creator && <span className="text-xs text-[#5A615D]">by {r.creator}</span>}
      </div>
    </a>
  )
}

export default function AskClient() {
  const [question, setQuestion] = useState('')
  const [asked, setAsked] = useState(null) // the question actually submitted
  const [answer, setAnswer] = useState('')
  const [results, setResults] = useState([])
  const [matchedTemplate, setMatchedTemplate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [disclaimer, setDisclaimer] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const runAsk = async (q) => {
    const text = (q ?? question).trim()
    if (!text) return
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setAsked(text)
    setQuestion(text)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, limit: 8 }),
        signal: controller.signal,
      })
      const data = await res.json()
      setAnswer(data.answer || '')
      setResults(data.results || [])
      setMatchedTemplate(data.matched_template || null)
      setDisclaimer(data.disclaimer || null)
    } catch (e) {
      if (e.name === 'AbortError') return
      setError('Something went wrong reaching the catalog. Try again.')
      setResults([])
      setAnswer('')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    runAsk()
  }

  return (
    <div className="min-h-screen bg-neptune px-4">
      <div className="container mx-auto max-w-3xl pt-16 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="eyebrow mb-4 justify-center">// ASK WORKFLOWSTACKS</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Describe your problem.<br />
            <span className="text-[#C6F24E]">Get real open-source tools.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            No keyword guessing — ask like you'd ask a person. We rank the WorkflowStacks catalog against what you actually typed and hand you the tools that match, sourced and clickable.
          </p>
        </div>

        {/* Ask box */}
        <form onSubmit={onSubmit} className="mb-6">
          <div className="bg-[#101314]/80 backdrop-blur-sm border border-[#262B2D] focus-within:border-[#C6F24E]/50 rounded-xl p-2 flex items-stretch gap-2 shadow-2xl shadow-black/40">
            <div className="flex items-center pl-3 text-[#5A615D]">
              <Search className="w-5 h-5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. How do I transcribe and summarize meetings automatically?"
              className="flex-1 bg-transparent text-white placeholder:text-slate-500 outline-none px-2 py-3 text-base"
              aria-label="Ask a question"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="bg-[#C6F24E] hover:bg-[#A6D62E] disabled:opacity-50 disabled:cursor-not-allowed text-[#0A0C0D] px-5 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Ask
            </button>
          </div>
        </form>

        {/* Example questions — only before the first ask */}
        {!asked && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => runAsk(ex)}
                className="px-3 py-1.5 bg-[#101314] hover:bg-[#1a1d1f] border border-[#262B2D] rounded-full text-sm text-slate-300 hover:text-white transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Answer + results */}
        {asked && (
          <div className="mt-10">
            {loading ? (
              <div className="text-center py-16">
                <Loader2 className="w-8 h-8 text-[#C6F24E] animate-spin mx-auto mb-4" />
                <p className="text-slate-400">Searching the catalog for "{asked}"…</p>
              </div>
            ) : error ? (
              <div className="text-center py-16 text-rose-400">{error}</div>
            ) : (
              <>
                {disclaimer && (
                  <div className="mb-6 text-xs text-amber-300/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-2">
                    {disclaimer}
                  </div>
                )}

                {answer && (
                  <div className="mb-8 bg-[#101314] border border-[#262B2D] rounded-xl p-5">
                    <p className="text-white text-base leading-relaxed">{answer}</p>
                  </div>
                )}

                {matchedTemplate && (
                  <Link
                    href={`/templates/${matchedTemplate.slug}`}
                    className="block mb-6 bg-[#0A0C0D] border border-[#C6F24E]/40 rounded-xl p-5 hover:border-[#C6F24E]/70 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-[#C6F24E]" />
                      <span className="text-xs font-mono uppercase tracking-wide text-[#C6F24E]">Ready-to-run template match</span>
                    </div>
                    <h3 className="text-white font-semibold mb-1">{matchedTemplate.title}</h3>
                    <p className="text-slate-400 text-sm">{matchedTemplate.outcome}</p>
                  </Link>
                )}

                {results.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.map((r, i) => (
                      <ResultCard key={r.id || r.slug || i} r={r} rank={i + 1} />
                    ))}
                  </div>
                ) : !matchedTemplate ? (
                  <div className="text-center py-16 text-slate-400">
                    No catalog matches for that yet — try different words, or{' '}
                    <Link href="/skills" className="text-[#C6F24E] hover:underline">browse all skills</Link>.
                  </div>
                ) : null}

                {results.length > 0 && (
                  <div className="text-center mt-10">
                    <button
                      onClick={() => { setAsked(null); setQuestion(''); inputRef.current?.focus() }}
                      className="text-slate-400 hover:text-white text-sm underline underline-offset-4"
                    >
                      Ask something else
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
