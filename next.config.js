// Standalone landing pages: static sites under public/sites/<dir>/ — plain
// HTML with their own CSS, JS and media, no Next layout, header or footer.
//
// Each one is served at `path` on the main site (its canonical URL, listed in
// app/sitemap.js) and, once the hostname is attached to the Vercel project,
// at "/" on `host` as well. `host` is a regex (Next anchors it with ^…$); the
// localhost alternative lets you preview the hostname variant at
// http://founder-avatar.localhost:3001/ under `npm run dev`. Pages link their
// media by absolute /sites/<dir>/… paths so one file works on both URLs.
// See docs/subdomain-landing-pages.md.
const LANDING_PAGES = [
  {
    path: '/ai-avatar',
    dir: 'founder-avatar-studio',
    host: 'founder-avatar\\.(?:workflowstacks\\.com|localhost)',
  },
]

const nextConfig = {
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },
  async redirects() {
    // Canonical host is the apex (workflowstacks.com) — everything (canonicals,
    // sitemap, JSON-LD) declares it. 308 any www traffic to apex permanently.
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.workflowstacks.com' }],
        destination: 'https://workflowstacks.com/:path*',
        permanent: true,
      },
      {
        // /bundles never existed as an index — only /bundles/[slug] does — yet
        // it was linked from the header nav AND the footer, so every page on
        // the site pointed at a 404. /tools is already that index (it lists
        // every bundle and carries the metadata), so send the URL there rather
        // than build a second one. Exact path only: /bundles/:slug must not
        // be caught by this.
        source: '/bundles',
        destination: '/tools',
        permanent: true,
      },
      ...LANDING_PAGES.flatMap((site) => [
        // The folder and its index.html are reachable at their real path;
        // fold both onto the canonical path so the page has one indexable URL.
        // Media under /sites/<dir>/ is deliberately left alone.
        { source: `/sites/${site.dir}/index.html`, destination: site.path, permanent: true },
        { source: `/sites/${site.dir}`, destination: site.path, permanent: true },
        // On the hostname, "/" is rewritten to index.html below; /index.html
        // there folds back to "/".
        { source: '/index.html', has: [{ type: 'host', value: site.host }], destination: '/', permanent: true },
      ]),
    ]
  },
  async rewrites() {
    return {
      // beforeFiles runs before the filesystem, so these paths reach the
      // static index.html instead of a Next page (or, for "/" on a landing-
      // page host, instead of the WorkflowStacks homepage).
      beforeFiles: LANDING_PAGES.flatMap((site) => {
        const onHost = [{ type: 'host', value: site.host }]
        return [
          // Canonical URL on the main site.
          { source: site.path, destination: `/sites/${site.dir}/index.html` },
          // Hostname variant: "/" is the page; every other path on that host is
          // one of the site's own files (robots.txt, sitemap.xml …). _next/
          // stays Next's, sites/ is already the real path (media lives there),
          // and the canonical path is handled by the rule above.
          { source: '/', has: onHost, destination: `/sites/${site.dir}/index.html` },
          { source: `/:path((?!_next/|sites/|${site.path.slice(1)}).*)`, has: onHost, destination: `/sites/${site.dir}/:path` },
        ]
      }),
      // Brand-evolution: 'stacks' is the new term for packs (more accurate for what
      // they are — curated combinations that solve a goal). Both URLs work; canonical
      // remains /packs for now to avoid SEO churn. We'll flip in a future pass.
      afterFiles: [
        { source: '/stacks', destination: '/packs' },
        { source: '/stacks/:id', destination: '/packs/:id' },
      ],
    }
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // CSP: the directives here are the ones that can be tightened without
          // nonces. script-src is deliberately NOT set — Next.js injects inline
          // hydration scripts, so a script-src without a per-request nonce would
          // either need 'unsafe-inline' (pointless) or white-screen the site.
          // Adding a nonce-based script-src via middleware is a separate,
          // riskier change that needs a report-only rollout first.
          //   object-src   — blocks <object>/<embed> plugin injection
          //   base-uri     — blocks <base> tag hijacking of every relative URL
          //   form-action  — forms are all JS-handled, none post cross-origin
          //   frame-ancestors — unchanged, blocks clickjacking
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self';",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
      {
        // CORS only on the API, not the whole site. The catalog is a public
        // read API (and /docs promises POST /api/agent-templates), so the
        // origin stays open unless CORS_ORIGINS narrows it — but nothing
        // cross-origin needs PUT/DELETE or arbitrary request headers, and a
        // wildcard origin combined with wildcard methods+headers is the
        // sloppy part. Our own pages are same-origin and never hit CORS;
        // server-side consumers (MCP connector, npx CLI, curl) aren't subject
        // to it at all, so tightening this breaks no supported client.
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
