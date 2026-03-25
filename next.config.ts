import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép IP của máy đồng nghiệp cùng mạng LAN kết nối vào NextJS Dev Server HMR
  // (Tính năng bảo mật mới của Next.js chặn kết nối beda origin theo mặc định)
  allowedDevOrigins: ['192.168.1.20'],
} as any;

export default nextConfig;
