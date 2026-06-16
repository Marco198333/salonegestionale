import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5180
  },
  preview: {
    port: 4180
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
