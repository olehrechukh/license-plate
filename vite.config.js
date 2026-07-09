import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// FE-only SPA. The feed lives at the project root and is imported at build time.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  }
})
