import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Fix for unified/vfile packages using Node.js builtins
      '#minpath': 'node_modules/vfile/lib/minpath.browser.js',
      '#minproc': 'node_modules/vfile/lib/minproc.browser.js',
      '#minurl': 'node_modules/vfile/lib/minurl.browser.js',
    },
  },
  optimizeDeps: {
    include: ['react-markdown', 'remark-gfm'],
  },
  build: {
    rollupOptions: {
      // Suppress warnings for these packages
    },
  },
})
