/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // better-sqlite3 und sharp sind native Node-Module (.node-Binaries) und dürfen nicht
    // von webpack gebündelt werden – sie werden zur Laufzeit direkt aus node_modules geladen.
    serverComponentsExternalPackages: ['better-sqlite3', 'sharp'],
    serverActions: {
      // Foto- und PDF-Uploads in der Verwaltung laufen über Server-Aktionen (Standard wäre 1 MB).
      bodySizeLimit: '16mb',
    },
  },
}

module.exports = nextConfig
