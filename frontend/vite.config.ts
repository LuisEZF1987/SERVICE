import os from 'node:os'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Cache outside the project folder: Dropbox locks node_modules/.vite (EBUSY)
  cacheDir: path.join(os.tmpdir(), 'vite-cache-dimedservice'),
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
