/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  distDir: process.env.KINETIX_BUILD_DIR || ".next",
  ...(process.env.KINETIX_CONSTRAINED_BUILD === "true"
    ? {
        experimental: {
          webpackBuildWorker: false,
          workerThreads: true,
          cpus: 1,
        },
      }
    : {}),
};

export default nextConfig;
