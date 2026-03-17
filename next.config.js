/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],

  // Sanity Studio und UI-Pakete müssen transpiliert werden
  transpilePackages: ['sanity', '@sanity/ui', 'next-sanity', 'styled-components'],

  images: {
    remotePatterns: [
      {
        // Sanity CDN für Bilder und Dateien
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
