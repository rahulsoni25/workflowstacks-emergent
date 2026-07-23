// Fake-door "coming soon" tools — deliberately NOT built yet. We list them,
// measure "notify me" signups, and only build the ones with real demand.
// Picked from the RevOps / admin-drudgery angles that are universal but
// unproven. Signups are the validation that decides what gets built.
export const COMING_SOON = [
  { slug: 'invoice-extractor', title: 'Invoice & Receipt Extractor', blurb: 'Forward receipts to an address → auto-extracted to a bookkeeping sheet. Month-end, gone.' },
  { slug: 'churn-radar', title: 'Churn Radar', blurb: 'Flags paying customers who’ve gone quiet or downgraded, before they cancel.' },
  { slug: 'refund-leak-finder', title: 'Refund Leak Finder', blurb: 'Scans your payments for double-charges, failed webhooks, and billing mismatches.' },
  { slug: 'social-mention-alerts', title: 'Social Mention Alerts', blurb: 'Get pinged whenever your brand is mentioned on Reddit, X, or news.' },
]
