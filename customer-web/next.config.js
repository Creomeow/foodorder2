/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker needs 'standalone'; Vercel needs 'export' (zero serverless functions,
  // staying under the Hobby plan's 12-function limit); next dev ignores 'output'.
  output: process.env.NEXT_STANDALONE === 'true' ? 'standalone' : 'export',
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
