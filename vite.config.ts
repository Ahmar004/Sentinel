/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // The app shell only. Live cell, zone, drone, alert and suggestion data
      // must never be served from cache: SRS 2.5 requires a client with no
      // live connection to show cells as unknown, not as a stale last frame.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api\//, /^\/ws\//],
      },
      manifest: {
        name: 'Sentinel',
        short_name: 'Sentinel',
        description: 'Crowd Control and Stampede Early Signs Detection System',
        theme_color: '#0b1220',
        background_color: '#0b1220',
        display: 'standalone',
        icons: [
          {
            src: 'sentinel.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // The screen tests mount whole screens against the ticking mock
    // backend; several render Recharts surfaces. Under full-suite worker
    // contention that can pass 5 s, so the ceiling is raised rather than
    // the coverage cut.
    testTimeout: 15000,
  },
})
