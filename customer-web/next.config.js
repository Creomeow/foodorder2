/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
