/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // better-sqlite3 ist ein natives Node-Modul (.node-Binary) und darf nicht
    // von webpack gebündelt werden – es wird zur Laufzeit direkt aus node_modules geladen.
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
}

module.exports = nextConfig
