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
          { key: "Content-Security-Policy", value: "frame-ancestors 'self';" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
      {
        // CORS only on the API, not the whole site
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
