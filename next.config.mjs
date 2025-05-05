/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    allowedDevOrigins: ['http://192.168.1.96:3001', 'http://localhost:3001'],
  };
  
  export default nextConfig;