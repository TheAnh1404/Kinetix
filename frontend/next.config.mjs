import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const getNextConfig = (phase) => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    // Keep dev's writable cache separate from production builds so one Next.js
    // process cannot replace manifests while the other process serves routes.
    distDir:
      phase === PHASE_DEVELOPMENT_SERVER
        ? process.env.KINETIX_DEV_BUILD_DIR || ".next-dev"
        : process.env.KINETIX_BUILD_DIR || ".next",
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
