import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/primevue') || id.includes('node_modules/@primevue/themes')) {
            return 'primevue';
          }
          if (id.includes('node_modules/quill')) {
            return 'quill';
          }
          if (id.includes('node_modules/chart.js')) {
            return 'chartjs';
          }
          if (id.includes('node_modules/@vladmandic/face-api')) {
            return 'face-api';
          }
          if (id.includes('node_modules/tesseract.js')) {
            return 'tesseract';
          }
          if (id.includes('node_modules/simple-keyboard')) {
            return 'simple-keyboard';
          }
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router')) {
            return 'vendor';
          }
        }
      }
    }
  }
})
