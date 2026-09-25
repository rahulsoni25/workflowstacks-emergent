// Standalone landing pages served from their own hostname.
//
// Each entry is a static site under public/sites/<dir>/ — plain HTML with its
// own CSS, JS and media, no Next layout, header or footer. Requests to `host`
// are rewritten into that folder (see rewrites().beforeFiles), so the folder's
// index.html answers "/" and its assets answer "/<file>". `host` is a regex
// (Next anchors it with ^…$); the localhost alternative lets you preview the
// site at http://founder-avatar.localhost:3001/ under `npm run dev`.
//
// The one step that is not in this repo is serving the hostname: add it to
// the Vercel project (Settings → Domains) and create the DNS record Vercel
// shows for it. See docs/subdomain-landing-pages.md.
const SUBDOMAIN_SITES = [
  {
    host: 'founder-avatar\\.(?:workflowstacks\\.com|localhost)',
    canonicalHost: 'founder-avatar.workflowstacks.com',
    dir: 'founder-avatar-studio',
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
      ...SUBDOMAIN_SITES.flatMap((site) => {
        const onSite = [{ type: 'host', value: site.host }]
        const onApex = [{ type: 'host', value: 'workflowstacks.com' }]
        return [
          // "/" on the subdomain is rewritten to index.html below; if someone
          // reaches the file by name, fold it back so there is one URL.
          { source: '/index.html', has: onSite, destination: '/', permanent: true },
          // The folder is also reachable at its real path on the apex — that is
          // how a Vercel preview (whose host matches nothing) can still open
          // it. On the apex proper, send it to the subdomain so the page has a
          // single indexable URL. index.html first, so it lands on "/" in one
          // hop instead of two.
          { source: `/sites/${site.dir}/index.html`, has: onApex, destination: `https://${site.canonicalHost}/`, permanent: true },
          { source: `/sites/${site.dir}/:path*`, has: onApex, destination: `https://${site.canonicalHost}/:path*`, permanent: true },
        ]
      }),
    ]
  },
  async rewrites() {
    return {
      // beforeFiles runs before the filesystem, so "/" on a landing-page host
      // reaches its index.html instead of the WorkflowStacks homepage.
      beforeFiles: SUBDOMAIN_SITES.flatMap((site) => {
        const has = [{ type: 'host', value: site.host }]
        return [
          { source: '/', has, destination: `/sites/${site.dir}/index.html` },
          // Every other path on the host is one of the site's own files
          // (hero.mp4, robots.txt, sitemap.xml …). _next/ stays Next's, and
          // sites/ is already the real path.
          { source: '/:path((?!_next/|sites/).*)', has, destination: `/sites/${site.dir}/:path` },
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
