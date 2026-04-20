import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [mkcert()],
  server: {
    host: '0.0.0.0', // Allow access from phone on same network
    port: 5173,
    https: true, // mkcert handles this with a trusted cert
    headers: {
      // Required for SharedArrayBuffer (used by ZapWorks WASM)
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  },
  // Exclude ZapWorks packages from Vite pre-bundling.
  // ZapWorks loads zappar-cv.wasm via new URL('./zappar-cv.wasm', import.meta.url).
  // When Vite pre-bundles these packages it moves the JS to .vite/deps/ but
  // doesn't copy the .wasm file there, so the WASM fetch 404s and the camera
  // never starts. Excluding them makes Vite serve them straight from node_modules
  // so the relative WASM path resolves correctly.
  optimizeDeps: {
    exclude: ['@zappar/zappar-threejs', '@zappar/zappar', '@zappar/zappar-cv']
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
