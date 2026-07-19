import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Les avatars utilisent surtout <img> (pas next/image) aujourd'hui.
    // remotePatterns reste configuré pour une migration future éventuelle vers next/image.
    // Wildcard Next : * = un segment de sous-domaine (ex: {storeId}.public.blob.vercel-storage.com)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
    ],
  },
};

export default nextConfig;
