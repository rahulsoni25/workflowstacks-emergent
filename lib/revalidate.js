import { revalidatePath } from 'next/cache'

// Skill detail pages regenerate on a 7-day timer (app/skills/[id]/page.js) —
// daily regeneration of ~2.7k pages was the bulk of the Hobby-plan ISR-write
// and Active-CPU overage. The endpoints that actually change a skill's page
// content call this so the edit shows up on the next visit instead of waiting
// out the week. Star/velocity refreshes deliberately do NOT call it: they touch
// every skill several times a day and would undo the saving.
export function revalidateSkill(skill) {
  try {
    if (skill?.slug) revalidatePath(`/skills/${skill.slug}`)
    // Slugless skills are served at their UUID (middleware only redirects once
    // a slug exists).
    if (skill?.id && skill.id !== skill.slug) revalidatePath(`/skills/${skill.id}`)
  } catch {
    // Never fail a content write because cache invalidation threw.
  }
}
