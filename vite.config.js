import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Make these available globally for your app
    '__app_id': JSON.stringify(process.env.VITE_APP_ID || 'default-app-id'),
    '__firebase_config': JSON.stringify(process.env.VITE_FIREBASE_CONFIG || '{}'),
    '__initial_auth_token': JSON.stringify(process.env.VITE_INITIAL_AUTH_TOKEN || null),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'react-vendor': ['react', 'react-dom'],
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    host: true, // Allow access from mobile on local network
  },
})

