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
    ]
  },
  async rewrites() {
    // Brand-evolution: 'stacks' is the new term for packs (more accurate for what
    // they are — curated combinations that solve a goal). Both URLs work; canonical
    // remains /packs for now to avoid SEO churn. We'll flip in a future pass.
    return [
      { source: '/stacks', destination: '/packs' },
      { source: '/stacks/:id', destination: '/packs/:id' },
    ]
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
