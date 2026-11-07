/** @type {import('next').NextConfig} */
const nextConfig = {
  // Projektordner festlegen, damit eine package-lock.json weiter oben im Dateisystem nicht stört.
  turbopack: { root: __dirname },
  // better-sqlite3 und sharp sind native Node-Module (.node-Binaries) und dürfen nicht
  // gebündelt werden – sie werden zur Laufzeit direkt aus node_modules geladen. imapflow bringt
  // den Logger pino mit (Worker-Threads), der gebündelt nicht zuverlässig läuft.
  serverExternalPackages: ['better-sqlite3', 'sharp', 'imapflow'],
  experimental: {
    serverActions: {
      // Foto- und PDF-Uploads in der Verwaltung laufen über Server-Aktionen (Standard wäre 1 MB).
      bodySizeLimit: '16mb',
    },
  },
  async redirects() {
    return [
      // Früher schaltete /vorschau/<design> per Cookie das Bento-Design ein. Es ist jetzt das
      // einzige Design – verschickte Vorschau-Links führen einfach zur Startseite.
      { source: '/vorschau/:pfad*', destination: '/', permanent: false },
    ]
  },
}

module.exports = nextConfig
