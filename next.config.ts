import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  typedRoutes: true, 
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bfvfphsyljpxkevjwbtt.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/assets/**",
      },
    ],
  },
};

export default nextConfig;
