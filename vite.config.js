import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0', // Allow access from phone on same network
    port: 5173,
    https: true // AR requires HTTPS
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
