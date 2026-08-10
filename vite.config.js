import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig(({ mode }) => ({
  base: './',
  // Camera testing uses trusted HTTPS in development. Production preview stays
  // certificate-free; the deployed site supplies HTTPS at the host layer.
  plugins: mode === 'development' ? [mkcert()] : [],
  server: {
    host: '0.0.0.0', // Allow access from phone on same network
    port: 5173,
    https: true // mkcert handles this with a trusted cert
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    https: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
}));
