/** @type {import('next').NextConfig}
const nextConfig = {};

export default nextConfig;
*/

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false, encoding: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
}

module.exports = nextConfig