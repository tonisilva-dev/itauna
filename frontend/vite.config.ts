import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => ({
  define: {
    __BUILD_TIME__: JSON.stringify(
      command === 'build'
        ? new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit', hour12: false })
        : 'dev'
    ),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        swDest: 'dist/sw.js',
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}', 'logo-itauna.png', 'logo-itauna-192.png', 'logo-itauna-512.png'],
        globIgnores: ['**/login-bg*.png', '**/bg-area-livre*.webp', '**/landing-bg*.webp', '**/galeria/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: 'Chácaras Itaúna',
        short_name: 'Itaúna',
        description: 'Portal do condômino — Condomínio Chácaras Itaúna · Ibiporã–PR',
        theme_color: '#07101c',
        background_color: '#07101c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          { src: '/logo-itauna-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/logo-itauna-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        categories: ['utilities', 'lifestyle'],
        screenshots: [],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('recharts')) return 'charts';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
}));
