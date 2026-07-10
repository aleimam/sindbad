import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sindbad/ui', '@sindbad/shared'],
  // Lean, self-contained server bundle — enabled only in the Docker build
  // (BUILD_STANDALONE=1). Windows dev can't emit standalone (symlink perms),
  // so local/CI builds use the default output.
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
