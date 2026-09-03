// Single source of truth for the site's public origin.
//
// The canonical host is the apex (workflowstacks.com): next.config.js 308s
// www → apex, and every canonical tag, sitemap entry and JSON-LD URL is meant
// to declare it. Before this module ~25 files each hardcoded their own
// fallback for an unset NEXT_PUBLIC_BASE_URL — and they disagreed (about
// half fell back to the *.vercel.app preview host), so a missing env var
// silently produced mixed hosts across canonicals, OG tags, the sitemap and
// robots.txt. Import this everywhere instead of re-deriving it.
//
// Deliberately dependency-free: it is imported by the Edge middleware and by
// client components as well as server code.
export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks.com'
