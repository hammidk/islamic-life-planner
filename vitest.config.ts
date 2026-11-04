import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Тесты интерфейса: jsdom, без PWA-плагина
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
