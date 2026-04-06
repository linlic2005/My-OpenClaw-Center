import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('react-dom') || id.includes('react/jsx-runtime') || id.includes('/react/')) {
            return 'react-core';
          }

          if (id.includes('react-router')) {
            return 'router';
          }

          if (id.includes('react-syntax-highlighter')) {
            return 'syntax-highlighter';
          }

          if (id.includes('react-markdown') || id.includes('remark-gfm')) {
            return 'markdown';
          }

          if (id.includes('@radix-ui') || id.includes('lucide-react')) {
            return 'ui-kit';
          }

          if (id.includes('@tanstack/react-query') || id.includes('axios') || id.includes('zustand')) {
            return 'data-layer';
          }
        },
      },
    },
  },
});
