/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker needs 'standalone'; Vercel needs 'export' (zero serverless functions,
  // staying under the Hobby plan's 12-function limit); local dev gets undefined
  // (no restriction) — Next.js 15 enforces output:export even in next dev.
  output: process.env.NEXT_STANDALONE === 'true' ? 'standalone'
        : process.env.VERCEL === '1' ? 'export'
        : undefined,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

module.exports = nextConfig;
