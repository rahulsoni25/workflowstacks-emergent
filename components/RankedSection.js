import SkillRow from '@/components/SkillRow'

// A titled, ranked list block. Renders nothing when empty unless an `empty`
// message is given (used for Hot before velocity data exists).
export default function RankedSection({ title, hint = null, items = [], rank = false, showVelocity = false, empty = null }) {
  if (!items.length && !empty) return null
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 text-2xl font-bold tracking-tight text-text-primary">{title}</h2>
        {hint && <span className="t-mono text-xs text-text-muted">{hint}</span>}
      </div>
      {items.length ? (
        <ol className="mt-4 list-none divide-y divide-[#262B2D] rounded-[14px] border border-[#262B2D] bg-[#101314] p-0">
          {items.map((s, i) => <SkillRow key={s.id || s.slug} skill={s} rank={rank ? i + 1 : null} showVelocity={showVelocity} />)}
        </ol>
      ) : (
        <p className="mt-4 rounded-[14px] border border-[#262B2D] bg-[#101314] px-5 py-6 text-sm text-text-muted">{empty}</p>
      )}
    </section>
  )
}
