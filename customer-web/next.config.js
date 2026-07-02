/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' is needed for Docker but breaks Vercel's build output API.
  ...(process.env.NEXT_STANDALONE === 'true' && { output: 'standalone' }),
  // Skip build-time type checking — cross-workspace path aliases confuse
  // Vercel's isolated tsc. Run `npm run typecheck` locally / in CI instead.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,
  webpack: (config) => {
    // @foodorder/shared's TS source uses NodeNext-style `.js` specifiers for
    // its own (still-`.ts`) sibling files; teach webpack to resolve those.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

module.exports = nextConfig;
