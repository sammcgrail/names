import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// names.sebland.com is a subdomain served at root — base is '/'.
export default defineConfig({
  plugins: [preact()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1800,
  },
  server: { port: 3000, host: true },
});
