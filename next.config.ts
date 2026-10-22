import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a test build live alongside the dev server's .next folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
