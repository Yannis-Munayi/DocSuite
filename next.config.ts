import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "xlsx", "bcryptjs", "docx"],
};

export default nextConfig;
