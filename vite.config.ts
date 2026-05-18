import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/Budget/',
  
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icon.svg'],
      manifest: false, // Use public/manifest.json instead
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        navigateFallback: null, // We'll handle this in sw.js
        runtimeCaching: []
      },
      injectRegister: 'auto',
      devOptions: {
        enabled: true
      }
    })
  ],
  
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'idb': ['idb']
        }
      }
    }
  },
  
  server: {
    port: 3000,
    open: true
  }
});

// Made with Bob
