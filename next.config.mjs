/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['http://192.168.1.96:3001', 'http://localhost:3001', 'http://127.0.0.1:4204'],
};

export default nextConfig;