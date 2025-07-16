/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['randomuser.me'],
  },
  experimental: {
    serverActions:{
      bodySizeLimit:"5mb"
    }
  },
}

// ESM export
export default nextConfig
