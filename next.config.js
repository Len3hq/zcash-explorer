/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/agent-root',
          destination: 'http://127.0.0.1:3000',
        },
        {
          source: '/chat/:path*',
          destination: 'http://127.0.0.1:3000/chat/:path*',
        },
        {
          source: '/assets/:path*',
          destination: 'http://127.0.0.1:3000/assets/:path*',
        },
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:3000/api/:path*',
        },
        {
          source: '/elizaos-logo-light.png',
          destination: 'http://127.0.0.1:3000/elizaos-logo-light.png',
        },
        {
          source: '/socket.io/:path*',
          destination: 'http://127.0.0.1:3000/socket.io/:path*',
        },
      ],
    }
  },
}

module.exports = nextConfig
