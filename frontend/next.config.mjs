import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const getNextConfig = (phase) => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    // Keep dev's writable cache separate from production builds so one Next.js
    // process cannot replace manifests while the other process serves routes.
    distDir:
      process.env.KINETIX_BUILD_DIR ||
      (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"),
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

  return nextConfig;
};

export default getNextConfig;
