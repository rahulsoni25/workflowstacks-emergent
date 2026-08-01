import Link from 'next/link'

// Replaces the old full bordered/blurred per-page header bar. A thin divider
// + a real trail gives the row enough visual weight to not look empty, while
// staying lighter than a second nav bar stacked under the global one.
export default function Breadcrumb({ trail, pill, right }) {
  return (
    <div className="border-b border-[#1A1D1E]">
      <div className="container mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-[13px] text-slate-500 min-w-0 overflow-hidden">
          {trail.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <span className="text-slate-700">/</span>}
              {item.href ? (
                <Link href={item.href} className="text-slate-400 hover:text-[#C6F24E] transition-colors whitespace-nowrap">
                  {item.label}
                </Link>
              ) : (
                <span className="text-slate-200 font-medium truncate">{item.label}</span>
              )}
            </span>
          ))}
        </div>
        {pill && !right && (
          <span className="text-[10.5px] font-mono tracking-wide text-slate-500 border border-[#262B2D] rounded px-2 py-1 whitespace-nowrap shrink-0">
            {pill}
          </span>
        )}
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  )
}
