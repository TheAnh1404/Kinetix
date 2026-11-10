import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const getNextConfig = (phase) => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    ...(process.env.OUTPUT_STANDALONE === "true"
      ? { output: "standalone" }
      : {}),
    experimental: {
      outputFileTracingRoot: path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
      ),
    },
    // Keep dev's writable cache separate from production builds so one Next.js
    // process cannot replace manifests while the other process serves routes.
    distDir:
      phase === PHASE_DEVELOPMENT_SERVER
        ? process.env.KINETIX_DEV_BUILD_DIR || ".next-dev"
        : process.env.KINETIX_BUILD_DIR || ".next",
    ...(process.env.KINETIX_CONSTRAINED_BUILD === "true"
      ? {
          experimental: {
            outputFileTracingRoot: path.resolve(
              path.dirname(fileURLToPath(import.meta.url)),
              "..",
            ),
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
