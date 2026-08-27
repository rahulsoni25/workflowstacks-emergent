// The AEO answer block: 40–60 quotable words directly under the H1, plus the
// TL;DR list. This is the part answer engines lift, so it stays plain text.
export default function AnswerBox({ answer, tldr }) {
  if (!answer && (!tldr || !tldr.length)) return null
  return (
    <div className="my-6 rounded-xl border border-[#C6F24E]/30 bg-[#C6F24E]/[0.06] p-5">
      {answer && (
        <p className="text-[17px] leading-relaxed text-[#ECEFEA] m-0">
          <span className="mr-2 inline-block rounded bg-[#C6F24E] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#0A0C0D] align-middle">Answer</span>
          {answer}
        </p>
      )}
      {tldr && tldr.length > 0 && (
        <ul className="mt-4 mb-0 space-y-1.5 pl-5 text-[14.5px] text-[#A3ABA6] list-disc">
          {tldr.map((t, i) => (<li key={i}>{t}</li>))}
        </ul>
      )}
    </div>
  )
}
