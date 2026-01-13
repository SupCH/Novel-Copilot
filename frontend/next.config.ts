import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出，适合 CF Pages
  output: 'export',

  // 尾部斜杠，避免路由问题
  trailingSlash: true,

  // 静态导出不支持图片优化
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
