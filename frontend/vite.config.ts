import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('https://slack-backend-morphvm-8p9e2k2g.http.cloud.morph.so'),
    'import.meta.env.VITE_WS_URL': JSON.stringify('wss://slack-backend-morphvm-8p9e2k2g.http.cloud.morph.so')
  }
})
