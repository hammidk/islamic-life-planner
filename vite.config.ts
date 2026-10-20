import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' — относительные пути, чтобы сайт работал на GitHub Pages
// по адресу вида https://<user>.github.io/<repo>/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // обновление применяем сами (src/pwa.ts) — только когда это незаметно для пользователя
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png', 'favicon-64x64.png'],
      manifest: {
        id: './',
        name: 'Islamic Life Planner',
        short_name: 'Life Planner',
        description: 'Планирование дня вокруг намаза',
        lang: 'ru',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#ECEEEA',
        background_color: '#ECEEEA',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // кэшируем только файлы сборки; запросы к Supabase, намазам и погоде всегда идут в сеть
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // новая версия ждёт, пока src/pwa.ts не решит, что переключиться можно незаметно
        skipWaiting: false,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
})
