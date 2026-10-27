/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    qualities: [75, 85, 90],
  },
  async rewrites() {
    // In dev, proxy /api/* to the Express server so the client can call
    // relative paths without CORS friction. In production, set
    // NEXT_PUBLIC_API_BASE to your deployed API origin instead and this
    // rewrite is skipped (falsy destination is fine since fetch calls
    // build absolute URLs from NEXT_PUBLIC_API_BASE when it's set).
    const apiBase = process.env.API_PROXY_TARGET || 'http://localhost:3301';
    return [{ source: '/api/:path*', destination: `${apiBase}/api/:path*` }];
  },
};
module.exports = nextConfig;
