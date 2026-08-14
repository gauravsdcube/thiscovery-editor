import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'resources/src/index.jsx'),
      name: 'ThiscoveryEditor',
      formats: ['iife'],
      fileName: () => 'editor.js',
    },
    outDir: resolve(__dirname, 'resources/dist'),
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: (asset) => (asset.name && asset.name.endsWith('.css') ? 'editor.css' : asset.name),
      },
    },
  },
});
