import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 尾部斜杠，避免路由问题
  trailingSlash: true,

  // 图片优化（本地开发不需要）
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
