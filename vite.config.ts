import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' — относительные пути, чтобы сайт работал на GitHub Pages
// по адресу вида https://<user>.github.io/<repo>/
export default defineConfig({
  base: './',
  plugins: [react()],
})
