import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Everything the app requests at /api is forwarded to the Express server, so
// the frontend can call fetch('/api/...') with no host name and no CORS
// problems in development.
const apiProxy = { target: 'http://localhost:4000', changeOrigin: true }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The same proxy rule is needed for `vite preview`, which serves the
  // production build and does not inherit the dev server's config.
  preview: {
    port: 4173,
    proxy: { '/api': apiProxy },
  },
  server: {
    port: 5173,
    proxy: { '/api': apiProxy },
  },
})
