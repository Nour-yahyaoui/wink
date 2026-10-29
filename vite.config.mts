import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'frontend-demo',
  plugins: [react()],
  resolve: {
    alias: {
      '@db': path.resolve(__dirname, 'database-demo'),
      '@': path.resolve(__dirname, 'frontend-demo/src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.e2b.app'],
    fs: {
      allow: [path.resolve(__dirname)],
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['.e2b.app'],
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
