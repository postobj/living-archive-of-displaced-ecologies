import type { NextConfig } from "next";

const basePath = process.env.NEXT_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
