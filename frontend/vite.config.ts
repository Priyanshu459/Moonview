import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Resolve shared package directly from source in development
      '@moonview/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    // Proxy API requests to the backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Proxy media requests to backend in dev (production uses Nginx)
      '/media': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    port: 4173,
  },

  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    // Chunk splitting strategy
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react';
          }
          if (id.includes('node_modules/react-router/')) {
            return 'router';
          }
          if (id.includes('node_modules/@tanstack/react-query/')) {
            return 'query';
          }
          if (id.includes('node_modules/hls.js/')) {
            return 'hlsjs';
          }
        },
      },
    },
  },
});
