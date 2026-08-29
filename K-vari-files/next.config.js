const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // route.json / pois.json — small, load-bearing, refresh in background
        urlPattern: /\/data\/(route|pois)\.json$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'wari-data',
          expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        // The forecast packet: network-first so a connected phone gets the
        // freshest timeline, cache fallback so a disconnected one still has
        // an answer. This is the core of the offline story.
        urlPattern: /\/api\/v1\/palki\/packet/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'palki-packet',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Versioned route geometry. Immutable by contract: a new trace gets
        // a new version number rather than mutating this one, so cache-first
        // is safe and saves ~92 KB on every load.
        urlPattern: /\/api\/v1\/palki\/route\/\d+/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'palki-route',
          expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // OSM raster tiles for the route corridor, z10-15
        urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/(1[0-5]|[0-9])\/\d+\/\d+\.png$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'osm-tiles',
          expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-api',
          networkTimeoutSeconds: 4,
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 6 },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@turf/nearest-point-on-line', '@turf/distance', '@turf/helpers'],
  },
};

module.exports = withPWA(nextConfig);
