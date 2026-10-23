/** @type {import('next').NextConfig} */
const nextConfig = {
  // Projektordner festlegen, damit eine package-lock.json weiter oben im Dateisystem nicht stört.
  turbopack: { root: __dirname },
  // better-sqlite3 und sharp sind native Node-Module (.node-Binaries) und dürfen nicht
  // gebündelt werden – sie werden zur Laufzeit direkt aus node_modules geladen.
  serverExternalPackages: ['better-sqlite3', 'sharp'],
  experimental: {
    serverActions: {
      // Foto- und PDF-Uploads in der Verwaltung laufen über Server-Aktionen (Standard wäre 1 MB).
      bodySizeLimit: '16mb',
    },
  },
}

module.exports = nextConfig
