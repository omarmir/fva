import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: ['vite.613868.xyz'],
    proxy: {
      '/api/vllm': {
        target: process.env.VLLM_PROXY_TARGET ?? 'http://vllm.613868.xyz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/vllm/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
