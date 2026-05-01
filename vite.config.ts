import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.GITHUB_REPOSITORY 
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/',
  
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Budget Tracker - Offline Budget Manager',
        short_name: 'Budget',
        description: 'Privacy-focused offline budget tracker',
        theme_color: '#4ECDC4',
        background_color: '#ffffff',
        display: 'standalone',
        scope: './',
        start_url: './',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    })
  ],
  
  build: {
    target: 'es2020',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'chart': ['chart.js'],
          'idb': ['idb']
        }
      }
    }
  }
});

// Made with Bob
