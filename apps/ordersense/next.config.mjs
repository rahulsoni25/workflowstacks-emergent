/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SheetJS and PapaParse are used in route handlers only; keep them out of the
  // client bundle by marking them as server-external.
  experimental: {
    serverComponentsExternalPackages: ['xlsx', 'papaparse'],
  },
};

export default nextConfig;
