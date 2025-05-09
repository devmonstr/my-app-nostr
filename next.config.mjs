/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['http://192.168.1.96:3001', 'http://localhost:3001'],
  reactStrictMode: true, // From next.config.ts
  images: {
    domains: [
      'via.placeholder.com', // For fallback images
      'nostr.build', // Common domain for Nostr profile pictures
      'cdn.nostr.build',
      'i.imgur.com', // If users use Imgur for profile pictures
      'pbs.twimg.com', // If users use Twitter-hosted images
      'avatars.githubusercontent.com', // If users use GitHub avatars
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS domains (less secure, but more flexible)
      },
    ],
  },
};

export default nextConfig;