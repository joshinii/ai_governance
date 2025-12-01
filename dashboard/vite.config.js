import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const hmrConfig = { protocol: 'wss' }
if (process.env.VITE_HMR_HOST) hmrConfig.host = process.env.VITE_HMR_HOST
if (process.env.VITE_HMR_CLIENT_PORT) hmrConfig.clientPort = Number(process.env.VITE_HMR_CLIENT_PORT)

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    // allow TryCloudflare subdomains (frontend is served via trycloudflare)
    allowedHosts: ['.trycloudflare.com'],    
    hmr: hmrConfig,
    proxy: {
      '/api': {
        target: 'https://blah-subsequent-personal-synthetic.trycloudflare.com',
        changeOrigin: true,
      },
    },
  },
})
