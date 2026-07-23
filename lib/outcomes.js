// Programmatic outcome-SEO pages. Each targets a real buyer-intent search
// ("how do I automate X") and maps HONESTLY to a working template we ship —
// no fabricated capability. This is the same SSR/enrichment infrastructure,
// re-aimed at demand-side queries instead of repo names.

export const OUTCOMES = {
  'automate-product-descriptions': {
    slug: 'automate-product-descriptions',
    template: 'ai-product-descriptions',
    persona: 'ecommerce',
    h1: 'Automate your product descriptions with AI',
    title: 'How to Automate Product Descriptions with AI (Free Workflow)',
    metaDescription: 'Stop writing product descriptions one by one. This free workflow turns a spreadsheet of products into polished, conversion-ready descriptions in bulk — set up in 5 minutes.',
    pain: 'Writing product descriptions by hand is the slowest, most repetitive part of launching a catalog — and it’s the first thing that gets skipped when you’re busy, leaving listings that don’t convert.',
    how: 'You keep your products in a Google Sheet. The workflow reads each one, writes a benefit-led description in a consistent brand voice, and saves it back — for your whole catalog at once. You review and publish.',
    faqs: [
      { q: 'Do I need to know how to code?', a: 'No. You import a ready-made workflow into n8n (a free no-code tool), connect your Google account and an AI key, and click run.' },
      { q: 'What does it cost to run?', a: 'The workflow is free. You only pay the AI provider per description — typically a fraction of a cent each.' },
      { q: 'Can I control the writing style?', a: 'Yes. The instructions live in one node you can edit in plain English — set the tone, length, and what to emphasize.' },
    ],
  },
  'bulk-product-descriptions-shopify': {
    slug: 'bulk-product-descriptions-shopify',
    template: 'ai-product-descriptions',
    persona: 'ecommerce',
    h1: 'Write bulk product descriptions for your Shopify store',
    title: 'Bulk Product Descriptions for Shopify with AI — Free Template',
    metaDescription: 'Generate product descriptions for your entire Shopify catalog from one spreadsheet. Free AI workflow, no code, running in about 5 minutes.',
    pain: 'A growing Shopify catalog means hundreds of descriptions to write and rewrite. Doing it manually doesn’t scale, and generic AI chat tools make you copy-paste one product at a time.',
    how: 'Export your products to a Google Sheet, run the workflow once, and it fills in a description for every product without one — in your chosen tone. Import the results back into Shopify.',
    faqs: [
      { q: 'Does this connect directly to Shopify?', a: 'This version works through a Google Sheet (export products in, import descriptions back) so it works with any store. Want a direct Shopify integration built for you? See our done-for-you option.' },
      { q: 'How many products can it handle?', a: 'As many as you put in the sheet — it processes them in one run.' },
    ],
  },
  'automate-review-replies': {
    slug: 'automate-review-replies',
    template: 'review-reply-drafter',
    persona: 'ecommerce',
    h1: 'Automate replies to your customer reviews',
    title: 'How to Automate Customer Review Replies with AI (Free)',
    metaDescription: 'Draft personalized replies to every customer review — including careful responses to negative ones — automatically. Free workflow you approve before posting.',
    pain: 'Every review deserves a reply, but keeping up is a grind — and the negative ones, which matter most, are the easiest to fumble when you’re rushed or frustrated.',
    how: 'The workflow reads your reviews and drafts a personalized reply for each: warm thanks for happy customers, careful and de-escalating for unhappy ones. Nothing posts automatically — you approve every draft.',
    faqs: [
      { q: 'Will it post replies without me?', a: 'No. It only drafts replies into a sheet for your approval — you stay in control of what goes public.' },
      { q: 'How does it handle angry reviews?', a: 'Negative reviews get a specific, de-escalating reply that acknowledges the problem and offers a next step — never a defensive or generic response.' },
    ],
  },
  'ai-review-responder': {
    slug: 'ai-review-responder',
    template: 'review-reply-drafter',
    persona: 'ecommerce',
    h1: 'An AI review responder for your store',
    title: 'AI Review Responder — Free No-Code Workflow',
    metaDescription: 'Turn a pile of unanswered reviews into personalized, on-brand draft replies with AI. Free, no code, you approve before anything is posted.',
    pain: 'Unanswered reviews signal a store that isn’t paying attention — but manually responding to each one, in the right tone, eats hours you don’t have.',
    how: 'Paste your reviews into a Google Sheet and the workflow drafts a reply to each in your brand voice. Approve, then post. For high volume with escalation routing, there’s a PRO version.',
    faqs: [
      { q: 'What platforms does it work with?', a: 'Any — Shopify, Amazon, Google, Trustpilot, Judge.me. You bring the reviews into a sheet; the source doesn’t matter.' },
      { q: 'Is there a more advanced version?', a: 'Yes — the Review Management System PRO adds priority alerts for negative reviews, sentiment tagging, and logging.' },
    ],
  },
  'automate-meeting-summaries': {
    slug: 'automate-meeting-summaries',
    template: 'meeting-summary-email',
    persona: 'founder',
    h1: 'Automate your meeting summaries',
    title: 'How to Automate Meeting Summaries from Transcripts (Free)',
    metaDescription: 'Paste any meeting transcript and get a clean summary email — decisions, action items, and owners — in seconds. Free no-code workflow.',
    pain: 'The real work after a meeting is writing up who agreed to what — and it’s exactly the task everyone avoids, so decisions get lost and action items slip.',
    how: 'A private form takes any transcript (from Zoom, Meet, Otter, Fireflies) and emails you back a structured summary: a TL;DR, the decisions made, and action items with owners.',
    faqs: [
      { q: 'Where does the transcript come from?', a: 'Any tool that gives you meeting text — Zoom, Google Meet, Otter, Fireflies, or even a pasted chat log. You paste it into a private form.' },
      { q: 'Who gets the summary?', a: 'Whichever email you enter in the form — send it to yourself, your team, or a client.' },
    ],
  },
  'meeting-notes-to-email': {
    slug: 'meeting-notes-to-email',
    template: 'meeting-summary-email',
    persona: 'founder',
    h1: 'Turn meeting notes into a summary email automatically',
    title: 'Turn Meeting Transcripts into Summary Emails — Free Workflow',
    metaDescription: 'Convert raw meeting transcripts into polished summary emails with action items automatically. Free, no code, set up in 5 minutes.',
    pain: 'Raw transcripts are unreadable, and nobody re-listens to a recording. Without a clean written summary, meetings produce talk but no follow-through.',
    how: 'Paste the transcript into a private form and the workflow writes and emails a concise recap — decisions, owners, open questions — that people will actually read.',
    faqs: [
      { q: 'How long can the transcript be?', a: 'A full meeting’s worth of text works fine. Very long transcripts may hit your AI provider’s limit, which you can raise in settings.' },
      { q: 'Can I change the summary format?', a: 'Yes — the structure lives in one editable instruction node you can adjust in plain English.' },
    ],
  },
  'automate-client-reports': {
    slug: 'automate-client-reports',
    template: 'weekly-client-report',
    persona: 'agency',
    h1: 'Automate your weekly client reports',
    title: 'How to Automate Weekly Client Reports (Free Agency Workflow)',
    metaDescription: 'Turn your metrics spreadsheet into a written, client-ready weekly report — and email it automatically every Monday. Free no-code workflow for agencies.',
    pain: 'Monday reporting is a tax on every agency: exporting numbers, writing the same “here’s what happened” narrative per client, every single week.',
    how: 'Keep each client’s metrics in a Google Sheet. Every Monday the workflow reads the week’s numbers, writes a plain-English narrative — what moved, why, and what’s next — and emails it to the client.',
    faqs: [
      { q: 'Where do the metrics come from?', a: 'Any source you can get into a sheet — GA4, Meta Ads, Shopify, a dashboard export. You paste or pipe the week’s row in.' },
      { q: 'Can I run it per client?', a: 'Yes — duplicate the workflow per client and point each at its own sheet and recipient.' },
    ],
  },
  'automated-marketing-reports': {
    slug: 'automated-marketing-reports',
    template: 'weekly-client-report',
    persona: 'agency',
    h1: 'Automated marketing performance reports',
    title: 'Automated Marketing Reports — Free Workflow for Agencies',
    metaDescription: 'Generate written marketing performance reports from your metrics automatically, and send them on a schedule. Free, no code.',
    pain: 'Dashboards show numbers, but clients want the story — what changed and why. Writing that narrative every reporting cycle is hours of skilled, repetitive work.',
    how: 'The workflow reads your performance metrics and writes the narrative for you — this week at a glance, what moved and why, what’s next — then sends it on schedule.',
    faqs: [
      { q: 'Does it just dump numbers?', a: 'No — it writes a client-readable narrative with comparisons and reasoning, using only the numbers in your data.' },
      { q: 'Can I white-label it?', a: 'The email is fully editable. For custom branding and multi-client setups, see our done-for-you option.' },
    ],
  },
  'repurpose-blog-to-social': {
    slug: 'repurpose-blog-to-social',
    template: 'content-repurposer',
    persona: 'agency',
    h1: 'Repurpose blog posts into social media content',
    title: 'How to Repurpose Blog Posts into Social Posts with AI (Free)',
    metaDescription: 'Turn one blog post into a LinkedIn post, an X thread, an Instagram caption, and an email blurb automatically — in your voice. Free no-code workflow.',
    pain: 'You publish one great piece, then it dies — because manually reshaping it for LinkedIn, X, Instagram, and email is a second job you never get to.',
    how: 'Paste one piece of content into a private form and the workflow emails you back four ready-to-post formats — LinkedIn, X thread, Instagram, and an email blurb — all in the original’s voice.',
    faqs: [
      { q: 'Does it keep my writing voice?', a: 'Yes — it repurposes the actual ideas and phrasing from your piece rather than flattening it into generic marketing copy.' },
      { q: 'Which formats do I get?', a: 'A LinkedIn post, an X/Twitter thread, an Instagram caption with hashtags, and a short newsletter blurb.' },
    ],
  },
  'personalize-cold-emails': {
    slug: 'personalize-cold-emails',
    template: 'cold-email-personalizer',
    persona: 'sales',
    h1: 'Personalize your cold emails at scale',
    title: 'How to Personalize Cold Emails with AI (Free Workflow)',
    metaDescription: 'Turn a list of prospects into genuinely specific cold-email openers — each scored for specificity so you kill the generic ones. Free no-code workflow.',
    pain: 'Generic cold emails get ignored, but researching and writing a truly personal opener for every prospect doesn’t scale — so most outreach ends up sounding the same.',
    how: 'You keep prospects in a Google Sheet with a note about each. The workflow writes a specific one-line opener per prospect and scores it 1–5, so you can send the strong ones and fix the weak ones.',
    faqs: [
      { q: 'Does it send the emails?', a: 'No — it writes and scores the openers into a sheet for you. You send from your own tool, so you stay in control of deliverability.' },
      { q: 'What makes an opener score high?', a: 'Specificity — a line that references something only that prospect would recognize. Generic flattery scores low by design.' },
    ],
  },
  'triage-your-inbox': {
    slug: 'triage-your-inbox',
    template: 'inbox-reply-triage',
    persona: 'founder',
    h1: 'Triage your inbox automatically',
    title: 'How to Auto-Triage Your Inbox with AI (Free Workflow)',
    metaDescription: 'Automatically classify every incoming email — hot lead, needs reply, FYI, ignore — with a suggested reply, ranked in a sheet. Free no-code workflow.',
    pain: 'As a founder your inbox is a firehose — real leads and expecting-a-reply humans get buried under newsletters, receipts, and cold spam, and something important always slips.',
    how: 'The workflow watches your inbox and classifies each new email by priority with a one-line reason and a draft reply, logging everything to a ranked sheet. You open your day to a triaged list, not a pile.',
    faqs: [
      { q: 'Does it reply or delete anything?', a: 'No — it only classifies and logs, and drafts suggested replies for you to review. Nothing is sent or deleted automatically.' },
      { q: 'Does it work with Outlook?', a: 'The template uses Gmail, but you can swap the trigger and log steps for Outlook or IMAP — the AI classification stays the same.' },
    ],
  },
  'recover-abandoned-carts': {
    slug: 'recover-abandoned-carts',
    template: 'abandoned-cart-winback',
    persona: 'ecommerce',
    h1: 'Recover abandoned carts with personalized emails',
    title: 'How to Recover Abandoned Carts with AI Win-Back Emails (Free)',
    metaDescription: 'Draft a personalized, non-pushy win-back email for every abandoned cart — referencing the exact product left behind. Free no-code workflow, you approve before sending.',
    pain: 'Abandoned carts are your warmest lost sales, but generic "you left something behind" blasts feel like spam and manually writing a real note per cart never happens.',
    how: 'Export abandoned carts to a Google Sheet and the workflow drafts a warm, specific win-back email for each — referencing the actual product, without desperate discount-spam. You review and send.',
    faqs: [
      { q: 'Does it send the emails automatically?', a: 'No — it drafts them into a sheet for your approval. You send from your email tool, keeping full control.' },
      { q: 'Does it invent discounts?', a: 'No. The prompt avoids fake scarcity and won’t promise a discount you didn’t offer — it leans on a genuine, low-pressure nudge.' },
    ],
  },
  'score-leads-icp-fit': {
    slug: 'score-leads-icp-fit',
    template: 'icp-fit-checker',
    persona: 'sales',
    h1: 'Score your leads by ideal-customer fit',
    title: 'How to Score Leads by ICP Fit with AI (Free Workflow)',
    metaDescription: 'Automatically score every lead against your ideal customer profile, 1–5 with a reason, so you focus outreach on prospects who’ll actually buy. Free, no code.',
    pain: 'A big lead list feels like progress, but most of it isn’t your buyer — and manually judging fit for every row is the work nobody does, so outreach gets sprayed at everyone.',
    how: 'You describe your ideal customer once and keep leads in a Google Sheet. The workflow scores each 1–5 for fit with a one-line reason, so you sort and work the best first.',
    faqs: [
      { q: 'How does it know my ideal customer?', a: 'You edit one plain-English ICP description inside the workflow. The more specific you are about who you win with, the sharper the scores.' },
      { q: 'Does it need my CRM?', a: 'No — it works from a simple spreadsheet, so there’s nothing to integrate.' },
    ],
  },
  'prep-for-sales-objections': {
    slug: 'prep-for-sales-objections',
    template: 'objection-prep-card',
    persona: 'sales',
    h1: 'Prep for sales objections before every call',
    title: 'AI Sales Objection Prep — Free No-Code Workflow',
    metaDescription: 'Generate the 3 likely objections and strong responses for every upcoming deal, so you never get caught improvising on a call. Free workflow.',
    pain: 'The objections that lose deals are the ones you didn’t see coming — and prepping for each call by hand is exactly what gets skipped when the calendar is full.',
    how: 'List your upcoming deals with a little context, and the workflow builds a prep card per deal: the 3 objections you’re most likely to hear, an honest response to each, and one sharp question to ask.',
    faqs: [
      { q: 'Are the objections generic?', a: 'They’re built from the context you give each deal — price sensitivity, competitors, decision-makers — so the more you note, the more specific they get.' },
      { q: 'Does it push hard-sell responses?', a: 'No — the responses acknowledge the objection honestly and reframe, rather than steamrolling. That’s what actually works.' },
    ],
  },
  'reduce-meeting-no-shows': {
    slug: 'reduce-meeting-no-shows',
    template: 'meeting-noshow-reducer',
    persona: 'sales',
    h1: 'Reduce meeting no-shows automatically',
    title: 'How to Reduce Meeting No-Shows with Auto Reminders (Free)',
    metaDescription: 'Automatically email a friendly confirming reminder to everyone you’re meeting tomorrow, cutting no-shows. Free no-code workflow, runs every morning.',
    pain: 'A no-show is a wasted slot and a lost deal, and the fix — a timely, human reminder — is the small task that always slips when you’re busy.',
    how: 'Keep your meetings in a Google Sheet. Every morning the workflow emails a warm, confirming reminder to anyone scheduled for the next day — automatically, in your voice.',
    faqs: [
      { q: 'Does it send automatically?', a: 'Yes — reminders are low-risk, so this one sends on its own each morning. You can edit the message to match your tone.' },
      { q: 'Do I need a calendar integration?', a: 'No — it reads a simple spreadsheet of meetings, so it works no matter how you book.' },
    ],
  },
  'content-repurposing-automation': {
    slug: 'content-repurposing-automation',
    template: 'content-repurposer',
    persona: 'agency',
    h1: 'Automate your content repurposing',
    title: 'Content Repurposing Automation — Free Workflow',
    metaDescription: 'Automatically turn long-form content into multi-platform social posts. Free, no code, in your voice — set up in about 5 minutes.',
    pain: 'Content repurposing is where most calendars break: the strategy makes sense, but nobody has time to manually rewrite every piece for every channel.',
    how: 'One private form, one paste, four formats back by email — every time you publish. It removes the manual reshaping that stalls content programs.',
    faqs: [
      { q: 'Do I need scheduling tools?', a: 'This gives you the ready-to-post copy. Paste into your scheduler of choice — or ask us to build the posting step too.' },
      { q: 'Can agencies use it per client?', a: 'Yes — duplicate it per client and tune the voice for each in the instruction node.' },
    ],
  },
}

export function getOutcome(slug) {
  if (!Object.prototype.hasOwnProperty.call(OUTCOMES, slug)) return null
  return OUTCOMES[slug]
}

// Outcome pages that map to a given template — for internal cross-linking.
export function outcomesForTemplate(templateSlug) {
  return Object.values(OUTCOMES)
    .filter((o) => o.template === templateSlug)
    .map(({ slug, h1 }) => ({ slug, h1 }))
}
