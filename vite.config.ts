import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',
      buffer: 'buffer',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/storage'],
          ui: ['lucide-react'],
        },
        // Améliorer la gestion des noms de fichiers pour éviter les conflits de cache
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    // Forcer la génération de nouveaux hashes à chaque build
    sourcemap: false,
    // Améliorer la stabilité des builds
    target: 'es2015',
    minify: 'esbuild',
  },
  server: {
    hmr: {
      overlay: false,
    },
  },
});