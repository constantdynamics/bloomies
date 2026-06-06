import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Bloomies draait als project-site op GitHub Pages onder /bloomies/.
// Daarom moet `base` exact de repo-naam zijn.
export default defineConfig({
  base: '/bloomies/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
