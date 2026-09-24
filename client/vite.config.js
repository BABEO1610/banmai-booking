import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Keep the GPU engine out of the shared app bundle and non-landing routes.
        manualChunks(id) { if (id.replaceAll('\\', '/').includes('/node_modules/three/')) return 'studio-3d' },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.API_PROXY_TARGET || 'http://localhost:3000',
      '/media': process.env.API_PROXY_TARGET || 'http://localhost:3000',
    },
  },
})
